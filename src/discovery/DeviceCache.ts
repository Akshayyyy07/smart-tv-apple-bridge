import fs from 'fs';
import path from 'path';

export interface CachedDevice {
  ip: string;
  mac: string;
  wiredMac?: string;
  transport: string;
  port: number;
  model: string;
  lastSeen: string;
}

export class DeviceCache {
  private cachePath: string;

  constructor(customPath?: string) {
    this.cachePath = customPath || path.resolve(process.cwd(), 'cache', 'device.json');
    const dir = path.dirname(this.cachePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public getCached(): CachedDevice | null {
    try {
      if (fs.existsSync(this.cachePath)) {
        const raw = fs.readFileSync(this.cachePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public save(device: CachedDevice): void {
    try {
      fs.writeFileSync(this.cachePath, JSON.stringify(device, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write device cache:', err);
    }
  }
}
