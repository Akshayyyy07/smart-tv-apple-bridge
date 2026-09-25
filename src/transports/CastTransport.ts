import { ITransport, DeviceStatus } from './ITransport';

export class CastTransport implements ITransport {
  public name = 'Google Cast (DIAL/8009)';
  private connected: boolean = false;
  private host: string = '';

  public async connect(host: string, port: number = 8009): Promise<boolean> {
    this.host = host;
    // Cast transport stub - Baron TV does not run Google Cast daemon
    return false;
  }

  public async disconnect(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async sendKey(key: string): Promise<boolean> {
    return false;
  }

  public async sendIntent(action: string, component?: string): Promise<boolean> {
    return false;
  }

  public async launchApp(packageId: string, activity?: string): Promise<boolean> {
    return false;
  }

  public async sendText(text: string): Promise<boolean> {
    return false;
  }

  public async getStatus(): Promise<DeviceStatus> {
    return {
      connected: false,
      powerState: 'Unknown',
      volume: 0,
      muted: false,
      activeApp: 'None',
      transport: this.name,
      ip: this.host,
      port: 8009,
      model: 'Baron TV',
      androidVersion: '9',
    };
  }

  public async getScreenshot(): Promise<Buffer | null> {
    return null;
  }
}
