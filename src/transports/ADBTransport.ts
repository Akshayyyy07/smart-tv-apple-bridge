import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { ITransport, DeviceStatus } from './ITransport';
import { KEY_CODES, APP_SHORTCUTS } from '../remote/CommandMap';

const execFileAsync = promisify(execFile);

export class ADBTransport implements ITransport {
  public name = 'ADB (TCP/IP 5555)';
  private host: string = '';
  private port: number = 5555;
  private connected: boolean = false;
  private targetSerial: string = '';
  private cachedModel: string = 'Baron Smart TV';
  private cachedAndroidVersion: string = '9 (AOSP)';

  public async connect(host: string, port: number = 5555): Promise<boolean> {
    this.host = host;
    this.port = port;
    this.targetSerial = `${host}:${port}`;

    try {
      const { stdout } = await execFileAsync('adb', ['connect', this.targetSerial], { timeout: 5000 });
      if (stdout.includes('connected to') || stdout.includes('already connected')) {
        this.connected = true;

        // Fetch properties once on connect
        try {
          const modelRes = await this.runShell('getprop ro.product.model');
          const brandRes = await this.runShell('getprop ro.product.brand');
          const verRes = await this.runShell('getprop ro.build.version.release');
          if (modelRes) this.cachedModel = `${brandRes || 'Baron'} ${modelRes}`.trim();
          if (verRes) this.cachedAndroidVersion = verRes;
        } catch {
          // ignore
        }

        return true;
      }
      this.connected = false;
      return false;
    } catch (err) {
      this.connected = false;
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.targetSerial) {
      try {
        await execFileAsync('adb', ['disconnect', this.targetSerial], { timeout: 3000 });
      } catch {
        // ignore
      }
    }
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async sendKey(key: string): Promise<boolean> {
    if (!this.connected) {
      const reconnected = await this.connect(this.host, this.port);
      if (!reconnected) return false;
    }

    const lowerKey = key.toLowerCase();

    // Special handling for input / source
    if (lowerKey === 'input' || lowerKey === 'source') {
      try {
        await this.runShell('am start -a com.cvte.intent.SHOW_INPUT');
        return true;
      } catch {
        // fallback to standard keycode
      }
    }

    const code = KEY_CODES[lowerKey];
    if (code === undefined) {
      throw new Error(`Unknown remote key command: ${key}`);
    }

    try {
      await this.runShell(`input keyevent ${code}`);
      return true;
    } catch (err) {
      return false;
    }
  }

  public async sendIntent(action: string, component?: string): Promise<boolean> {
    try {
      const args = component
        ? `am start -n ${component} -a ${action}`
        : `am start -a ${action}`;
      await this.runShell(args);
      return true;
    } catch {
      return false;
    }
  }

  public async launchApp(shortcutOrPkg: string, activity?: string): Promise<boolean> {
    if (!this.connected) {
      await this.connect(this.host, this.port);
    }

    const shortcut = APP_SHORTCUTS[shortcutOrPkg.toLowerCase()];
    if (shortcut) {
      if (shortcut.intentAction) {
        return this.sendIntent(shortcut.intentAction);
      }
      if (shortcut.activity) {
        return this.sendIntent('android.intent.action.MAIN', `${shortcut.package}/${shortcut.activity}`);
      }
      // Launch by package using monkey
      try {
        await this.runShell(`monkey -p ${shortcut.package} -c android.intent.category.LAUNCHER 1`);
        return true;
      } catch {
        return false;
      }
    }

    // Direct package
    try {
      if (activity) {
        await this.runShell(`am start -n ${shortcutOrPkg}/${activity}`);
      } else {
        await this.runShell(`monkey -p ${shortcutOrPkg} -c android.intent.category.LAUNCHER 1`);
      }
      return true;
    } catch {
      return false;
    }
  }

  public async sendText(text: string): Promise<boolean> {
    if (!this.connected) await this.connect(this.host, this.port);
    try {
      // Escape spaces and special shell characters
      const escaped = text.replace(/ /g, '%s').replace(/([&|;*?~<>^()\[\]{}$'"`\\])/g, '\\$1');
      await this.runShell(`input text "${escaped}"`);
      return true;
    } catch {
      return false;
    }
  }

  public async getStatus(): Promise<DeviceStatus> {
    const status: DeviceStatus = {
      connected: this.connected,
      powerState: 'Unknown',
      volume: 15,
      muted: false,
      activeApp: 'Unknown',
      transport: this.name,
      ip: this.host,
      port: this.port,
      model: this.cachedModel,
      androidVersion: this.cachedAndroidVersion,
    };

    if (!this.connected) {
      return status;
    }

    try {
      // Power state
      const powerOutput = await this.runShell('dumpsys power');
      if (powerOutput.includes('mWakefulness=Awake')) {
        status.powerState = 'Awake';
      } else if (powerOutput.includes('mWakefulness=Asleep') || powerOutput.includes('mWakefulness=Dozing')) {
        status.powerState = 'Asleep';
      }

      // Audio / Volume
      const audioOutput = await this.runShell('dumpsys audio');
      const musicIdx = audioOutput.indexOf('- STREAM_MUSIC:');
      if (musicIdx !== -1) {
        const slice = audioOutput.substring(musicIdx, musicIdx + 300);
        status.muted = slice.includes('Muted: true');
        const currMatch = slice.match(/speaker\):\s*(\d+)/) || slice.match(/default\):\s*(\d+)/);
        if (currMatch) {
          status.volume = parseInt(currMatch[1], 10);
        }
      }

      // Current focus / window
      const winOutput = await this.runShell('dumpsys window windows');
      const focusMatch = winOutput.match(/mCurrentFocus=Window\{[0-9a-fA-F]+\s+u0\s+([^}]+)\}/);
      if (focusMatch) {
        const full = focusMatch[1].trim();
        const parts = full.split('/');
        status.activeApp = parts[0];
      }
    } catch {
      // Keep best-effort status
    }

    return status;
  }

  public async getScreenshot(): Promise<Buffer | null> {
    if (!this.connected) return null;
    return new Promise((resolve) => {
      const proc = spawn('adb', ['-s', this.targetSerial, 'exec-out', 'screencap', '-p']);
      const chunks: Buffer[] = [];

      proc.stdout.on('data', (chunk) => chunks.push(chunk));
      proc.stderr.on('data', () => {});

      proc.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          resolve(null);
        }
      });

      proc.on('error', () => resolve(null));
    });
  }

  private async runShell(cmd: string): Promise<string> {
    const { stdout } = await execFileAsync('adb', ['-s', this.targetSerial, 'shell', cmd], {
      timeout: 5000,
    });
    return stdout.trim();
  }
}
