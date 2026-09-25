# 🍎 Smart TV Apple Ecosystem Bridge & Web Remote

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Apple HomeKit](https://img.shields.io/badge/Apple_HomeKit-Compatible-black.svg?style=flat-square&logo=apple)](https://www.apple.com/home-app/)
[![AirPlay](https://img.shields.io/badge/AirPlay-Supported-orange.svg?style=flat-square&logo=airplay)](https://www.apple.com/airplay/)
[![Android ADB](https://img.shields.io/badge/Android_ADB-TCP%2F5555-3DDC84.svg?style=flat-square&logo=android)](https://developer.android.com/tools/adb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

> Transform any budget Android Smart TV into a first-class citizen of the Apple ecosystem. Integrates native **Apple HomeKit**, **Siri Voice Remote**, **AirPlay Screen & Audio Mirroring**, and a tactile **Glassmorphic Web Remote (PWA)** over your local Wi-Fi without cloud dependencies, subscriptions, or root access.

---

## 🌟 Key Features

* **🏠 Apple HomeKit Television Accessory**:
  * Exposes the TV as an official HomeKit Television accessory.
  * Direct pairing with QR code or manual PIN.
  * Full integration with iOS **Control Center TV Remote widget** (swipe touchpad, volume buttons, back, menu).
* **🎙️ Siri Voice Control**:
  * Voice commands natively supported on iPhone, Apple Watch, HomePod, and Mac:
    * *"Hey Siri, turn off the TV"*
    * *"Hey Siri, mute the TV"*
    * *"Hey Siri, volume up on the TV"*
* **🍏 Apple AirPlay Mirroring**:
  * Native 1080p/60fps AirPlay video and synchronized audio receiver running locally on the TV.
  * Direct one-click screen mirroring from macOS Control Center and iOS Control Center.
  * Auto-starts silently on TV boot (`Start on boot = true`).
* **📱 Luxury Glassmorphic Web Remote (PWA)**:
  * Responsive mobile-first interface styled with modern glassmorphism.
  * Haptic vibration feedback on tactile button presses.
  * Real-time 720p TV screencap preview streaming.
  * Direct keyboard text injection for instant TV search without tedious on-screen cursor typing.
  * Quick-launch tiles for YouTube, Streaming apps, and System Settings.
* **⚡ 1GB RAM & Storage Optimizer**:
  * Built-in diagnostic and tuning scripts that recovered **+350MB internal storage** and **+82MB active RAM** on memory-constrained (1GB RAM) Android TV hardware.
  * Tunes window and transition animation scales to `0.5x` for instantaneous UI responsiveness.

---

## 🏗️ System Architecture

```text
                  +----------------------------------------------+
                  |            Local Home Wi-Fi Network          |
                  |                192.168.1.0/24                |
                  +----------------------------------------------+
                                   |           |
            +----------------------+           +----------------------+
            |                                                         |
    +---------------+                                         +---------------+
    |Android SmartTV|                                         |   Mac / iPhone|
    | 192.168.1.36  |                                         | 192.168.1.37  |
    +---------------+                                         +---------------+
            |                                                         |
            |--- [Port 5555]  TCP ADB Control Daemon <----------------| (Remote Control & ADB)
            |--- [Port 7000]  Apple AirPlay Receiver <----------------| (macOS / iOS Mirroring)
            |--- [mDNS 5353]  Bonjour (Baron TV._airplay._tcp) <------| (Auto-Discovery)
            |                                                         |
            |                                                         |
    +---------------+                                                 |
    | Web Remote &  |<------------------------------------------------+ (Browser UI / HomeKit)
    | HomeKit Daemon|
    | (Mac :3050)   |---> [mDNS 5353] Apple HomeKit (Baron TV 2A3A._hap._tcp)
    +---------------+
```

### Transport Layer Abstraction
The core remote coordinator uses an extensible, decoupled transport pattern:
```typescript
interface ITransport {
  connect(): Promise<boolean>;
  disconnect(): Promise<void>;
  sendKey(code: number): Promise<boolean>;
  sendText(text: string): Promise<boolean>;
  sendIntent(action: string): Promise<boolean>;
  captureScreen(): Promise<Buffer | null>;
  isConnected(): boolean;
}
```
* **`ADBTransport`**: Working TCP/IP ADB connection on port `5555`.
* **`CastTransport` / `HTTPTransport` / `WebSocketTransport`**: Extensible interface stubs for multi-protocol environments.

---

## 🎮 Hardware Compatibility

Tested and optimized for:
* **Baron Smart TV** (Amlogic/Droidlogic `r34az` CVTE mainboard, Android 9 AOSP)
* **Universal Android TVs**: Any smart TV or streaming box running Android TV 8.0+ with Network ADB / TCP 5555 enabled (e.g. Mi TV, TCL, Sony Bravia, OnePlus TV, Fire TV, generic Amlogic/Realtek boxes).

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v18 or higher) and **npm**
* **adb** installed (`brew install android-platform-tools` on macOS)
* Target Android TV connected to the same Wi-Fi network

### 1. Installation & Build
```bash
# Clone the repository
git clone https://github.com/Akshayyyy07/smart-tv-apple-bridge.git
cd smart-tv-apple-bridge

# Install dependencies
npm install

# Compile TypeScript
npm run build
```

### 2. Start the Server
```bash
npm start
```
The server will automatically detect the TV on the local subnet via mDNS and output:
```text
====================================================
🚀 SMART TV APPLE ECOSYSTEM & REMOTE SERVER
====================================================
[*] Local Mac IP:     192.168.1.37
[*] Remote Web App:   http://192.168.1.37:3050
----------------------------------------------------
[✔] Connected to Smart TV successfully!
[✔] Apple HomeKit Bridge active! Pincode: 031-45-154
[✔] Setup URI: X-HM://00UPGXRK2J9R7
[✔] Server listening on http://0.0.0.0:3050
👉 Open in your Mac browser:    http://localhost:3050
👉 Open on your phone:          http://192.168.1.37:3050
👉 Apple HomeKit Pincode:       031-45-154
====================================================
```

---

## 📱 Apple HomeKit Pairing

1. Ensure the bridge server is running (`npm start`).
2. Open the **Apple Home** app on your iPhone, iPad, or Mac.
3. Tap **+ (Add Accessory)** $\rightarrow$ **More options...**
4. Select **Baron TV 2A3A** (or your custom TV name).
5. Enter the pairing PIN code: **`031-45-154`** (or scan the on-screen QR code rendered at `http://localhost:3050`).
6. Your TV will now appear in Apple Home and in your iOS Control Center Apple TV Remote widget.

---

## 💻 REST API Reference

The server exposes standard REST endpoints for third-party automation (Stream Deck, Home Assistant, Shortcuts, Alfred):

| Endpoint | Method | Payload / Param | Description |
| :--- | :--- | :--- | :--- |
| `/api/key` | `POST` | `{"code": 24}` | Sends Android keycode (Volume, D-pad, Power) |
| `/api/source` | `POST` | `{"input": "HDMI1"}` | Triggers native vendor TV input menu |
| `/api/text` | `POST` | `{"text": "Interstellar"}` | Direct string injection into TV search bars |
| `/api/screencap` | `GET` | - | Returns raw PNG image buffer of the live TV screen |
| `/api/status` | `GET` | - | Returns connection health, IP, and latency |

---

## 📂 Project Structure

```text
smart-tv-apple-bridge/
├── BARON_TV_MANUAL.md           # Complete engineering audit & maintenance manual
├── assets/                      # Screen previews and documentation assets
├── src/
│   ├── discovery/
│   │   ├── DeviceCache.ts       # Runtime network cache persistence
│   │   └── NetworkDiscovery.ts  # mDNS + ARP subnet scanner
│   ├── homekit/
│   │   └── HomeKitBridge.ts     # HAP-NodeJS Apple HomeKit Television accessory
│   ├── public/
│   │   ├── index.html           # Luxury glassmorphic web remote UI & QR modal
│   │   ├── remote.css           # Tactile remote CSS styles & haptic feedback
│   │   └── remote.js            # Client-side remote controller & polling
│   ├── remote/
│   │   ├── CommandMap.ts        # Android keycodes & CVTE vendor intents
│   │   └── TVRemote.ts          # Central remote API coordinator
│   ├── tests/
│   │   └── test_remote.ts       # Automated integration test suite
│   ├── transports/
│   │   ├── ADBTransport.ts      # Active working ADB TCP transport
│   │   ├── ITransport.ts        # Decoupled transport interface
│   │   └── ...                  # Extensible stubs (Cast, REST, WS)
│   └── index.ts                 # Express REST & HomeKit server entry point
├── package.json
├── tsconfig.json
└── LICENSE
```

---

## 🤝 Contributing

Contributions, feature requests, and bug reports are welcome! Feel free to check the [issues page](https://github.com/Akshayyyy07/smart-tv-apple-bridge/issues).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.
