import {
  Accessory,
  Categories,
  Characteristic,
  CharacteristicEventTypes,
  CharacteristicSetCallback,
  CharacteristicValue,
  Service,
  uuid,
  HAPStorage,
} from 'hap-nodejs';
import path from 'path';
import { TVRemote } from '../remote/TVRemote';

export class HomeKitBridge {
  private remote: TVRemote;
  private tvAccessory!: Accessory;
  private pinCode = '031-45-154';
  private setupURI = '';

  constructor(remote: TVRemote) {
    this.remote = remote;
    HAPStorage.setCustomStoragePath(path.resolve(process.cwd(), 'cache', 'homekit'));
  }

  public async init(): Promise<string> {
    const tvUUID = uuid.generate('hap-nodejs:accessories:baron-smart-tv');
    this.tvAccessory = new Accessory('Baron TV', tvUUID);
    this.tvAccessory.category = Categories.TELEVISION;

    // Accessory Information
    this.tvAccessory
      .getService(Service.AccessoryInformation)!
      .setCharacteristic(Characteristic.Manufacturer, 'Baron / Droidlogic')
      .setCharacteristic(Characteristic.Model, 'SMART_TV (Android 9)')
      .setCharacteristic(Characteristic.SerialNumber, 'E0:27:6C:7B:EA:E9')
      .setCharacteristic(Characteristic.FirmwareRevision, '9.0.0');

    // Television Service
    const tvService = this.tvAccessory.addService(Service.Television, 'Baron TV', 'baron-tv');
    tvService.setCharacteristic(Characteristic.ConfiguredName, 'Baron TV');
    tvService.setCharacteristic(
      Characteristic.SleepDiscoveryMode,
      Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE
    );

    // Active (Power)
    tvService
      .getCharacteristic(Characteristic.Active)!
      .on(CharacteristicEventTypes.GET, async (callback) => {
        try {
          const status = await this.remote.getStatus();
          callback(null, status.powerState === 'Awake' ? 1 : 0);
        } catch {
          callback(null, 1);
        }
      })
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        try {
          const turnOn = value === 1;
          if (turnOn) {
            await this.remote.sendCommand('wakeup');
          } else {
            await this.remote.sendCommand('power');
          }
          callback(null);
        } catch (err: any) {
          callback(err);
        }
      });

    // Remote Key (iOS Control Center Remote widget)
    tvService
      .getCharacteristic(Characteristic.RemoteKey)!
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        try {
          switch (value) {
            case Characteristic.RemoteKey.REWIND:
              await this.remote.sendCommand('rewind');
              break;
            case Characteristic.RemoteKey.FAST_FORWARD:
              await this.remote.sendCommand('fast_forward');
              break;
            case Characteristic.RemoteKey.NEXT_TRACK:
              await this.remote.sendCommand('next');
              break;
            case Characteristic.RemoteKey.PREVIOUS_TRACK:
              await this.remote.sendCommand('prev');
              break;
            case Characteristic.RemoteKey.ARROW_UP:
              await this.remote.sendCommand('up');
              break;
            case Characteristic.RemoteKey.ARROW_DOWN:
              await this.remote.sendCommand('down');
              break;
            case Characteristic.RemoteKey.ARROW_LEFT:
              await this.remote.sendCommand('left');
              break;
            case Characteristic.RemoteKey.ARROW_RIGHT:
              await this.remote.sendCommand('right');
              break;
            case Characteristic.RemoteKey.SELECT:
              await this.remote.sendCommand('ok');
              break;
            case Characteristic.RemoteKey.BACK:
              await this.remote.sendCommand('back');
              break;
            case Characteristic.RemoteKey.EXIT:
              await this.remote.sendCommand('home');
              break;
            case Characteristic.RemoteKey.PLAY_PAUSE:
              await this.remote.sendCommand('play_pause');
              break;
            case Characteristic.RemoteKey.INFORMATION:
              await this.remote.sendCommand('menu');
              break;
          }
          callback(null);
        } catch (err: any) {
          callback(err);
        }
      });

    // Speaker Service (for Volume Up/Down on iPhone physical buttons)
    const speakerService = this.tvAccessory.addService(
      Service.TelevisionSpeaker,
      'Baron TV Speaker',
      'tv-speaker'
    );
    speakerService.setCharacteristic(
      Characteristic.VolumeControlType,
      Characteristic.VolumeControlType.RELATIVE_WITH_CURRENT
    );

    speakerService
      .getCharacteristic(Characteristic.VolumeSelector)!
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        try {
          if (value === Characteristic.VolumeSelector.INCREMENT) {
            await this.remote.sendCommand('vol_up');
          } else {
            await this.remote.sendCommand('vol_down');
          }
          callback(null);
        } catch (err: any) {
          callback(err);
        }
      });

    speakerService
      .getCharacteristic(Characteristic.Mute)!
      .on(CharacteristicEventTypes.GET, async (callback) => {
        try {
          const status = await this.remote.getStatus();
          callback(null, status.muted);
        } catch {
          callback(null, false);
        }
      })
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        try {
          await this.remote.sendCommand('mute');
          callback(null);
        } catch (err: any) {
          callback(err);
        }
      });

    tvService.addLinkedService(speakerService);

    // Input Sources (HDMI 1, YouTube, Hotstar, Live TV)
    const inputs = [
      { id: 1, name: 'HDMI 1', type: Characteristic.InputSourceType.HDMI, command: 'input' },
      { id: 2, name: 'YouTube', type: Characteristic.InputSourceType.APPLICATION, app: 'youtube' },
      { id: 3, name: 'Hotstar', type: Characteristic.InputSourceType.APPLICATION, app: 'hotstar' },
      { id: 4, name: 'Live TV', type: Characteristic.InputSourceType.TUNER, app: 'channels' },
    ];

    let currentInput = 1;
    tvService.setCharacteristic(Characteristic.ActiveIdentifier, currentInput);

    tvService
      .getCharacteristic(Characteristic.ActiveIdentifier)!
      .on(CharacteristicEventTypes.SET, async (value: CharacteristicValue, callback: CharacteristicSetCallback) => {
        try {
          const selected = inputs.find((i) => i.id === value);
          if (selected) {
            currentInput = selected.id;
            if (selected.app) {
              await this.remote.launchApp(selected.app);
            } else if (selected.command) {
              await this.remote.sendCommand(selected.command);
            }
          }
          callback(null);
        } catch (err: any) {
          callback(err);
        }
      });

    for (const input of inputs) {
      const inputService = this.tvAccessory.addService(
        Service.InputSource,
        input.name,
        `input-${input.id}`
      );
      inputService
        .setCharacteristic(Characteristic.Identifier, input.id)
        .setCharacteristic(Characteristic.ConfiguredName, input.name)
        .setCharacteristic(
          Characteristic.IsConfigured,
          Characteristic.IsConfigured.CONFIGURED
        )
        .setCharacteristic(Characteristic.InputSourceType, input.type)
        .setCharacteristic(
          Characteristic.CurrentVisibilityState,
          Characteristic.CurrentVisibilityState.SHOWN
        );

      tvService.addLinkedService(inputService);
    }

    // Publish as HomeKit Accessory on LAN
    await this.tvAccessory.publish({
      username: 'E0:27:6C:7B:EA:E9', // Using TV's exact wired MAC
      pincode: this.pinCode,
      port: 51827,
      category: Categories.TELEVISION,
    });

    this.setupURI = this.tvAccessory.setupURI();
    return this.setupURI;
  }

  public getPinCode(): string {
    return this.pinCode;
  }

  public getSetupURI(): string {
    return this.setupURI;
  }
}
