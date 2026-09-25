import { execFile } from 'child_process';
import { promisify } from 'util';
import net from 'net';
import { DeviceCache } from './DeviceCache';

const execFileAsync = promisify(execFile);

export interface DiscoveredTV {
  ip: string;
  port: number;
  mac: string;
  method: string;
  model: string;
}

export class NetworkDiscovery {
  private cache: DeviceCache;
  private knownTvs = ['192.168.1.36'];
  private targetMacWifi = '38:be:ab:9f:06:55';
  private targetMacWired = 'e0:27:6c:7b:ea:e9';
  private targetMacWifiAlt = '3b:be:a8:9f:06:55';

  constructor() {
    this.cache = new DeviceCache();
  }

  public async discover(forceScan: boolean = false): Promise<DiscoveredTV | null> {
    // 1. Check cache first
    if (!forceScan) {
      const cached = this.cache.getCached();
      if (cached && (await this.probePort(cached.ip, cached.port))) {
        return {
          ip: cached.ip,
          port: cached.port,
          mac: cached.mac,
          method: 'Cache (TCP Verified)',
          model: cached.model,
        };
      }
    }

    // 2. Fast probe of known/verified IP (192.168.1.36)
    for (const ip of this.knownTvs) {
      if (await this.probePort(ip, 5555)) {
        const discovered: DiscoveredTV = {
          ip,
          port: 5555,
          mac: this.targetMacWifi,
          method: 'Fast Probe (Port 5555)',
          model: 'Baron Smart TV',
        };
        this.cache.save({
          ip,
          port: 5555,
          mac: discovered.mac,
          transport: 'ADB',
          model: discovered.model,
          lastSeen: new Date().toISOString(),
        });
        return discovered;
      }
    }

    // 3. Fallback to ARP scan correlation
    const arpDevice = await this.discoverViaArp();
    if (arpDevice) {
      this.cache.save({
        ip: arpDevice.ip,
        port: arpDevice.port,
        mac: arpDevice.mac,
        transport: 'ADB',
        model: arpDevice.model,
        lastSeen: new Date().toISOString(),
      });
      return arpDevice;
    }

    return null;
  }

  private async discoverViaArp(): Promise<DiscoveredTV | null> {
    try {
      const { stdout } = await execFileAsync('arp', ['-a', '-n'], { timeout: 4000 });
      const lines = stdout.split('\n');
      for (const line of lines) {
        const match = line.match(/\?\s+\(([0-9.]+)\)\s+at\s+([0-9a-fA-F:]+)/);
        if (match) {
          const ip = match[1];
          const rawMac = match[2].toLowerCase();
          const normMac = rawMac
            .split(':')
            .map((p) => p.padStart(2, '0'))
            .join(':');

          if (
            normMac === this.targetMacWifi ||
            normMac === this.targetMacWired ||
            normMac === this.targetMacWifiAlt
          ) {
            if (await this.probePort(ip, 5555)) {
              return {
                ip,
                port: 5555,
                mac: normMac,
                method: 'ARP Table Correlation',
                model: 'Baron Smart TV',
              };
            }
          }
        }
      }
    } catch {
      // ignore
    }
    return null;
  }

  public probePort(ip: string, port: number, timeoutMs = 1200): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(timeoutMs);

      socket.on('connect', () => {
        socket.destroy();
        resolve(true);
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(false);
      });

      socket.on('error', () => {
        socket.destroy();
        resolve(false);
      });

      socket.connect(port, ip);
    });
  }
}
