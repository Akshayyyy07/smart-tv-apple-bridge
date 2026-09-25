# 📺 Baron Smart TV — Master Configuration & Engineering Manual
> **Last Updated:** September 2026  
> **Target Device:** Baron Smart TV (Android 9 / CVTE Droidlogic Platform)  
> **Companion Project:** `/Users/inintr00416/Desktop/baron-tv-remote`

---

## 📋 Table of Contents
1. [Device Profile & Hardware Specifications](#1-device-profile--hardware-specifications)
2. [Network & Communication Architecture](#2-network--communication-architecture)
3. [Apple Ecosystem Integration](#3-apple-ecosystem-integration)
   - [Apple AirPlay Screen Mirroring (Mac & iPhone)](#apple-airplay-screen-mirroring)
   - [Apple HomeKit & Siri TV Remote Bridge](#apple-homekit--siri-tv-remote-bridge)
4. [Storage & RAM Performance Optimization](#4-storage--ram-performance-optimization)
5. [Web Remote Control System](#5-web-remote-control-system)
6. [Future Maintenance & ADB Cheat Sheet](#6-future-maintenance--adb-cheat-sheet)

---

## 1. Device Profile & Hardware Specifications

| Specification | Value / Technical Detail |
| :--- | :--- |
| **Device Name** | `Baron TV` |
| **Current IP** | `192.168.1.36` (port `5555`) |
| **Wired Ethernet MAC** | `e0:27:6c:7b:ea:e9` (`eth0`) |
| **Wireless Wi-Fi MAC** | `38:be:ab:9f:06:55` (`wlan0`) |
| **mDNS Hostname** | `Android.local.` |
| **Android OS Version** | `9` (API 28, build `PPR1.180610.011`) |
| **Chipset / SoC** | Amlogic / Droidlogic (`r34az-userdebug test-keys`) |
| **Mainboard Vendor** | CVTE (Guangzhou Shiyuan Electronic Tech) |
| **System RAM** | 1 GB DDR3 (487 MB kernel space + hardware buffers) |
| **Internal Storage** | 8 GB eMMC (~4.8 GB usable `/data` partition) |
| **Default Launcher** | `com.cvte.tv.launcher.space/.MainActivity` |
| **Live TV Suite** | `com.cvte.tv.setting` (LiveTvGlobal) & `com.droidlogic.tvinput` |

---

## 2. Network & Communication Architecture

```text
                  +----------------------------------------------+
                  |            Local Home Wi-Fi Network          |
                  |                192.168.1.0/24                |
                  +----------------------------------------------+
                                   |           |
            +----------------------+           +----------------------+
            |                                                         |
    +---------------+                                         +---------------+
    |  Baron Smart  |                                         |   Mac / iPhone|
    |      TV       |                                         | 192.168.1.37  |
    | 192.168.1.36  |                                         +---------------+
    +---------------+                                                 |
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

### Protocol Summary
1. **ADB over TCP/IP (`5555`)**:
   - The TV runs an open ADB network daemon in `userdebug` test-keys mode.
   - Accepts connections without RSA prompt dialogs (`uid=2000(shell)` in group `1004(input)`).
   - Allows remote key events, screen frame grabs, package management, and system intents.
2. **AirPlay Receiver (`7000`)**:
   - Native AirPlay screen & audio mirroring receiver running directly on the TV (`dev.imirror.receiver`).
3. **Apple HomeKit (`HAP-NodeJS`)**:
   - Hosted on your Mac via the Node.js server (`src/homekit/HomeKitBridge.ts`), pairing the TV into iOS Home app.

---

## 3. Apple Ecosystem Integration

### Apple AirPlay Screen Mirroring

The Baron TV functions as a native AirPlay target with the display name **`Baron TV`**.

* **How to Mirror from Mac:**
  1. Click the **Control Center** icon in the macOS menu bar (top right, next to the clock).
  2. Click **Screen Mirroring**.
  3. Click **Baron TV**.
  4. Your Mac desktop and system audio will instantly play on the Baron TV.
* **How to Mirror from iPhone / iPad:**
  1. Swipe down from the top-right corner to open **Control Center**.
  2. Tap the **Screen Mirroring** tile (overlapping rectangles).
  3. Select **Baron TV**.
* **Configuration Details:**
  * **Package Name:** `dev.imirror.receiver`
  * **Configured Name:** `Baron TV`
  * **Auto-Start on Boot:** **Enabled** (`Start on boot = true` in app settings).
  * **Network Identity:** `model=AppleTV5,3`, device ID matches Wi-Fi MAC `38:be:ab:9f:06:55`.
  * **Restarting if needed via ADB:**
    ```bash
    adb shell am force-stop dev.imirror.receiver
    adb shell am start -n dev.imirror.receiver/.MainActivity
    ```

---

### Apple HomeKit & Siri TV Remote Bridge

The TV is bridged into the Apple Home ecosystem using `hap-nodejs`.

* **Accessory Name:** `Baron TV 2A3A`
* **Category:** Television
* **Setup PIN Code:** `031-45-154`
* **Setup URI:** `X-HM://00UPGXRK2J9R7`
* **Pairing Steps:**
  1. Ensure the Node server is running on the Mac (`npm start`).
  2. Open the **Apple Home** app on your iPhone, iPad, or Mac.
  3. Tap **Add Accessory** (`+` icon) -> **More options...**
  4. Select **Baron TV 2A3A**.
  5. Enter PIN `031-45-154` (or scan the QR code rendered in the web UI at `http://localhost:3050`).
* **Siri Voice Controls:**
  * *"Hey Siri, turn off Baron TV"*
  * *"Hey Siri, mute Baron TV"*
  * *"Hey Siri, volume up on Baron TV"*
* **iOS Control Center Remote Widget:**
  * Open iOS Settings -> Control Center -> add **Apple TV Remote**.
  * Swipe down Control Center, tap the Remote icon, and select **Baron TV** to navigate the TV using iPhone's native swipe touchpad and volume rocker.

---

## 4. Storage & RAM Performance Optimization

The TV originally suffered from severe storage starvation and RAM pressure (1GB physical RAM). Optimization dramatically improved fluidity:

### Before vs After

| Metric | Before Optimization | After Optimization | Improvement |
| :--- | :--- | :--- | :--- |
| **Free Storage (`/data`)** | 22 MB (97% full) | **371 MB** (58% empty) | **+349 MB** usable space |
| **Active System RAM** | High memory pressure | **+82 MB** RAM freed | JioCinema & bloat terminated |
| **UI Animation Scales** | 1.0x (sluggish) | **0.5x** | 2x snappier transitions |

### Actions Performed
1. **Uninstalled Redundant Bloatware** (Safe backups kept in `debug/apk_backups/`):
   * `com.jio.media.stb.ondemand` (JioCinema mobile — was consuming 82MB background RAM).
   * `in.startv.hotstar` (Duplicate mobile version; official Android TV version `in.startv.hotstar.dplus.tv` is retained).
   * `com.netflix.mediaclient` (Unsupported mobile build).
   * `com.amazon.amazonvideo.livingroom` (Incompatible build).
   * `com.system.memory.tool` & `com.system.update` (Adware cleaner wrappers).
2. **Purged Cache Junk**:
   * Removed stale crash dumps in `/data/tombstones/`.
   * Cleared gallery thumbnail cache `/data/data/com.android.providers.media/databases/`.
3. **Frozen Background System Services**:
   * `com.cvte.tv.pictorial` (Screensaver adware loop).
   * `com.cvte.tv.weather` (Periodic network sync service).
4. **Snappy Animations Configured**:
   ```bash
   adb shell settings put global window_animation_scale 0.5
   adb shell settings put global transition_animation_scale 0.5
   adb shell settings put global animator_duration_scale 0.5
   ```

---

## 5. Web Remote Control System

Located at `/Users/inintr00416/Desktop/baron-tv-remote`.

### How to Run
```bash
cd /Users/inintr00416/Desktop/baron-tv-remote

# 1. Install dependencies & compile TypeScript
npm install
npm run build

# 2. Start server
npm start
```

* **Mac Access:** Open `http://localhost:3050`
* **Mobile / Phone Access:** Open `http://192.168.1.37:3050` (or scan the on-screen QR code)
* **PWA Support:** On phone Chrome or Safari, tap **"Add to Home Screen"** for full-screen haptic remote.

### Key Remote Capabilities
* **Full D-Pad Navigation:** Up, Down, Left, Right, OK / Enter.
* **Volume & Mute:** Hardware `STREAM_MUSIC` volume stepping and instant mute toggle.
* **Source / Input Switcher:** Triggers native CVTE input selector (`com.cvte.intent.SHOW_INPUT`).
* **Live TV Channels:** Channel Up / Down and Channel List (`com.cvte.intent.action.CHANNEL_LIST`).
* **Live Screen Streaming:** Real-time 1280x720 TV screen capture pulled every 2 seconds.
* **Direct Text Typing:** Type queries on phone/Mac keyboard directly into TV search boxes.
* **Quick Launch Bar:** 1-tap launch for YouTube, Hotstar, and TV Settings.

---

## 6. Future Maintenance & ADB Cheat Sheet

Keep this section handy whenever you need to inspect or adjust the TV.

### 1. Connection & Connectivity
```bash
# Connect to TV over Wi-Fi
adb connect 192.168.1.36:5555

# Verify device is listed
adb devices

# Ping TV to test Wi-Fi latency
ping 192.168.1.36
```

### 2. Live TV Screen Captures
```bash
# Capture what the TV is showing right now to your Mac
adb shell "screencap -p /sdcard/screen.png" && adb pull /sdcard/screen.png ~/Desktop/baron_tv_screen.png
```

### 3. Check Storage & RAM
```bash
# Check free storage
adb shell df -h /data

# Check available RAM
adb shell dumpsys meminfo | head -n 25
```

### 4. Restore Any Backed-Up App
All original uninstalled APKs are safely stored on your Mac at `/Users/inintr00416/Desktop/baron-tv-remote/debug/apk_backups/`:
```bash
# Example: Reinstall JioCinema if needed
adb install -r /Users/inintr00416/Desktop/baron-tv-remote/debug/apk_backups/JioCinema.apk

# Example: Reinstall Hotstar mobile if needed
adb install -r /Users/inintr00416/Desktop/baron-tv-remote/debug/apk_backups/Hotstar_mobile.apk
```

### 5. Install Any New APK
```bash
adb install -r /path/to/any_android_tv_app.apk
```

### 6. Control Shortcuts & Special Intents
```bash
# Press Home
adb shell input keyevent 3

# Press Back
adb shell input keyevent 4

# Open Input / Source Menu (HDMI1, HDMI2, AV)
adb shell am start -a com.cvte.intent.SHOW_INPUT

# Open TV Settings
adb shell am start -a android.settings.SETTINGS

# Reboot the TV cleanly
adb reboot
```

### 7. Re-apply Performance Optimizations After Factory Reset
```bash
adb shell settings put global window_animation_scale 0.5
adb shell settings put global transition_animation_scale 0.5
adb shell settings put global animator_duration_scale 0.5
adb shell pm disable-user --user 0 com.cvte.tv.pictorial
adb shell pm disable-user --user 0 com.cvte.tv.weather
```
