import http from 'http';
import { ITransport, DeviceStatus } from './ITransport';
import { KEY_CODES } from '../remote/CommandMap';

export class HTTPTransport implements ITransport {
  public name = 'CVTE/EShare Remote (Port 8000)';
  private connected: boolean = false;
  private host: string = '';
  private port: number = 8000;
  private currentVolume: number = 38;
  private isMuted: boolean = false;

  public async connect(host: string, port: number = 8000): Promise<boolean> {
    this.host = host;
    this.port = port;

    try {
      const volData = await this.getVolume();
      if (volData) {
        this.connected = true;
        return true;
      }
    } catch {
      // ignore
    }
    this.connected = false;
    return false;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async sendKey(key: string): Promise<boolean> {
    const keycode = KEY_CODES[key.toLowerCase()];
    if (!keycode) {
      console.warn(`[HTTPTransport] Unknown key: ${key}`);
      return false;
    }

    return new Promise((resolve) => {
      const req = http.get(
        `http://${this.host}:${this.port}/remote/keycode_control?keycode=${keycode}`,
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async sendIntent(action: string, component?: string): Promise<boolean> {
    return false;
  }

  public async launchApp(packageId: string, activity?: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${this.host}:${this.port}/remote/activity_control?apkPackage=${encodeURIComponent(
          packageId
        )}&mainClass=${encodeURIComponent(activity || '')}`,
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async sendText(text: string): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(
        `http://${this.host}:${this.port}/remote/input_control?data=${encodeURIComponent(text)}`,
        (res) => {
          resolve(res.statusCode === 200);
        }
      );
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async getStatus(): Promise<DeviceStatus> {
    const vol = await this.getVolume();
    return {
      connected: this.connected,
      powerState: 'Awake',
      volume: vol?.volume ?? this.currentVolume,
      muted: vol?.muted ?? this.isMuted,
      activeApp: 'Live TV / Smart Screen',
      transport: this.name,
      ip: this.host,
      port: this.port,
      model: 'Ego 55-4K_708 (CVTE)',
      androidVersion: '9',
    };
  }

  public async getScreenshot(): Promise<Buffer | null> {
    return null;
  }

  private async getVolume(): Promise<{ volume: number; muted: boolean } | null> {
    return new Promise((resolve) => {
      const req = http.get(`http://${this.host}:${this.port}/remote/get_volume`, (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          try {
            const clean = body.replace(/'/g, '"');
            const data = JSON.parse(clean);
            if (data.status === 'ok') {
              this.currentVolume = parseInt(data.currentVolume, 10) || 38;
              this.isMuted = data.mute === 'true';
              this.connected = true;
              resolve({ volume: this.currentVolume, muted: this.isMuted });
              return;
            }
          } catch {
            // fallback
          }
          resolve(null);
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(1500, () => {
        req.destroy();
        resolve(null);
      });
    });
  }
}
