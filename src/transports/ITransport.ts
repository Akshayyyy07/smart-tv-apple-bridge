export interface DeviceStatus {
  connected: boolean;
  powerState: 'Awake' | 'Asleep' | 'Unknown';
  volume: number;
  muted: boolean;
  activeApp: string;
  transport: string;
  ip: string;
  port: number;
  model: string;
  androidVersion: string;
}

export interface ITransport {
  name: string;
  connect(host: string, port?: number): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  sendKey(key: string): Promise<boolean>;
  sendIntent(action: string, component?: string): Promise<boolean>;
  launchApp(packageId: string, activity?: string): Promise<boolean>;
  sendText(text: string): Promise<boolean>;
  getStatus(): Promise<DeviceStatus>;
  getScreenshot(): Promise<Buffer | null>;
}
