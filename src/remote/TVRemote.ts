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

    this.transports = [adb, cast, http, ws];
    this.activeTransport = adb; // Default to discovered working transport
  }

  public async init(targetIp?: string): Promise<boolean> {
    if (targetIp) {
      this.currentDevice = {
        ip: targetIp,
        port: 5555,
        mac: '38:be:ab:9f:06:55',
        method: 'Manual Override',
        model: 'Baron Smart TV',
      };
    } else {
      console.log('[*] Running network discovery for Baron TV...');
      this.currentDevice = await this.discovery.discover();
    }

    if (!this.currentDevice) {
      console.warn('[-] No Baron TV discovered automatically.');
      return false;
    }

    console.log(
      `[+] Connecting to Baron TV at ${this.currentDevice.ip}:${this.currentDevice.port} via ${this.activeTransport.name}`
    );

    const connected = await this.activeTransport.connect(
      this.currentDevice.ip,
      this.currentDevice.port
    );

    if (connected) {
      console.log(`[+] Successfully connected to Baron TV!`);
    } else {
      console.error(`[-] Failed to connect to Baron TV at ${this.currentDevice.ip}`);
    }

    return connected;
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
