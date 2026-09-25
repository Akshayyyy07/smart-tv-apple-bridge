import { ITransport, DeviceStatus } from './ITransport';

export class WebSocketTransport implements ITransport {
  public name = 'WebSocket API';
  private connected: boolean = false;
  private host: string = '';

  public async connect(host: string, port: number = 8001): Promise<boolean> {
    this.host = host;
    // WebSocket transport stub - TV does not expose WS port
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
      port: 8001,
      model: 'Baron TV',
      androidVersion: '9',
    };
  }

  public async getScreenshot(): Promise<Buffer | null> {
    return null;
  }
}
