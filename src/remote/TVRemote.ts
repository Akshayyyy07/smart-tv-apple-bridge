import { ITransport, DeviceStatus } from '../transports/ITransport';
import { ADBTransport } from '../transports/ADBTransport';
import { CastTransport } from '../transports/CastTransport';
import { HTTPTransport } from '../transports/HTTPTransport';
import { WebSocketTransport } from '../transports/WebSocketTransport';
import { NetworkDiscovery, DiscoveredTV } from '../discovery/NetworkDiscovery';

export class TVRemote {
  private activeTransport: ITransport;
  private transports: ITransport[];
  private discovery: NetworkDiscovery;
  private currentDevice: DiscoveredTV | null = null;

  constructor() {
    this.discovery = new NetworkDiscovery();
    const adb = new ADBTransport();
    const cast = new CastTransport();
    const http = new HTTPTransport();
    const ws = new WebSocketTransport();

    this.transports = [adb, http, cast, ws];
    this.activeTransport = http; // Default to CVTE/EShare port 8000
  }

  public async init(targetIp?: string): Promise<boolean> {
    const ip = targetIp || '192.168.1.5';
    this.currentDevice = {
      ip,
      port: 8000,
      mac: 'C0:8A:CD:AF:AF:E2',
      method: 'CVTE Native HTTP (Port 8000)',
      model: 'Ego 55-4K_708 Smart TV',
    };

    console.log(`[*] Connecting to TV at ${ip}:8000 via CVTE/EShare HTTP...`);
    const connected = await this.activeTransport.connect(ip, 8000);
    if (connected) {
      console.log(`[✔] Connected to Ego TV via CVTE/EShare HTTP transport!`);
      return true;
    }

    // Fallback to ADB transport
    const adbTransport = this.transports[0];
    const adbOk = await adbTransport.connect(ip, 5555);
    if (adbOk) {
      this.activeTransport = adbTransport;
      return true;
    }

    return false;
  }

  public async sendCommand(command: string): Promise<boolean> {
    return this.activeTransport.sendKey(command);
  }

  public async launchApp(appName: string): Promise<boolean> {
    return this.activeTransport.launchApp(appName);
  }

  public async sendText(text: string): Promise<boolean> {
    return this.activeTransport.sendText(text);
  }

  public async getStatus(): Promise<DeviceStatus> {
    return this.activeTransport.getStatus();
  }

  public async getScreenshot(): Promise<Buffer | null> {
    return this.activeTransport.getScreenshot();
  }

  public getDiscoveredDevice(): DiscoveredTV | null {
    return this.currentDevice;
  }

  public getActiveTransportName(): string {
    return this.activeTransport.name;
  }
}
