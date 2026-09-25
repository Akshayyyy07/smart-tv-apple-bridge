import { ITransport, DeviceStatus } from './ITransport';

export class HTTPTransport implements ITransport {
  public name = 'HTTP REST API';
  private connected: boolean = false;
  private host: string = '';

  public async connect(host: string, port: number = 8080): Promise<boolean> {
    this.host = host;
    // HTTP transport stub - Baron TV port 80/8080 closed
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
      port: 8080,
      model: 'Baron TV',
      androidVersion: '9',
    };
  }

  public async getScreenshot(): Promise<Buffer | null> {
    return null;
  }
}
