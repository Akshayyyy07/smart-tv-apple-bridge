import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import QRCode from 'qrcode';
import { TVRemote } from './remote/TVRemote';
import { HomeKitBridge } from './homekit/HomeKitBridge';

const app = express();
const port = parseInt(process.env.PORT || '3050', 10);
const remote = new TVRemote();
const homeKit = new HomeKitBridge(remote);

app.use(cors());
app.use(express.json());

// Serve static frontend files (support both ts-node and compiled dist)
let publicDir = path.resolve(__dirname, 'public');
if (!require('fs').existsSync(publicDir)) {
  publicDir = path.resolve(__dirname, '../src/public');
}
app.use(express.static(publicDir));

// Determine Mac LAN IP for mobile access
function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// REST API Endpoints

// 1. Status
app.get('/api/status', async (req, res) => {
  try {
    const status = await remote.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Command
app.post('/api/command', async (req, res) => {
  const { command } = req.body;
  if (!command) {
    return res.status(400).json({ error: 'Command is required' });
  }

  try {
    const success = await remote.sendCommand(command);
    res.json({ success, command });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Launch App
app.post('/api/app', async (req, res) => {
  const { app: appName } = req.body;
  if (!appName) {
    return res.status(400).json({ error: 'App name or package is required' });
  }

  try {
    const success = await remote.launchApp(appName);
    res.json({ success, app: appName });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Send Text
app.post('/api/text', async (req, res) => {
  const { text } = req.body;
  if (text === undefined) {
    return res.status(400).json({ error: 'Text is required' });
  }

  try {
    const success = await remote.sendText(text);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Screenshot
app.get('/api/screenshot', async (req, res) => {
  try {
    const buffer = await remote.getScreenshot();
    if (buffer) {
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(buffer);
    } else {
      res.status(503).json({ error: 'Screen capture unavailable' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. QR Code for Mobile Web Remote
app.get('/api/qr', async (req, res) => {
  const localIp = getLocalIp();
  const remoteUrl = `http://${localIp}:${port}`;
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(remoteUrl, { margin: 2, scale: 6 });
    res.json({ url: remoteUrl, qrCodeDataUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Apple HomeKit Pairing Info
app.get('/api/homekit', async (req, res) => {
  try {
    const uri = homeKit.getSetupURI();
    const pin = homeKit.getPinCode();
    const qrCodeDataUrl = await QRCode.toDataURL(uri, { margin: 2, scale: 6 });
    res.json({ setupURI: uri, pincode: pin, qrCodeDataUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Re-run Discovery
app.post('/api/discover', async (req, res) => {
  try {
    const connected = await remote.init();
    const device = remote.getDiscoveredDevice();
    res.json({ connected, device });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
async function startServer() {
  const localIp = getLocalIp();
  const remoteUrl = `http://${localIp}:${port}`;

  console.log('====================================================');
  console.log('🚀 BARON SMART TV APPLE ECOSYSTEM & REMOTE SERVER');
  console.log('====================================================');
  console.log(`[*] Local Mac IP:     ${localIp}`);
  console.log(`[*] Remote Web App:   ${remoteUrl}`);
  console.log('----------------------------------------------------');

  // Initialize TV connection
  const connected = await remote.init();
  if (connected) {
    console.log(`[✔] Connected to Baron TV successfully!`);
  } else {
    console.warn(`[!] TV not connected immediately. Will auto-retry on requests.`);
  }

  // Initialize Apple HomeKit Bridge
  console.log('[*] Initializing Apple HomeKit Television accessory...');
  try {
    await homeKit.init();
    console.log(`[✔] Apple HomeKit Bridge active! Pincode: ${homeKit.getPinCode()}`);
    console.log(`[✔] Setup URI: ${homeKit.getSetupURI()}`);
  } catch (err) {
    console.warn(`[!] HomeKit init warning:`, err);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`[✔] Server listening on http://0.0.0.0:${port}`);
    console.log(`👉 Open in your Mac browser:    http://localhost:${port}`);
    console.log(`👉 Open on your Android phone:  ${remoteUrl}`);
    console.log(`👉 Apple HomeKit Pincode:       ${homeKit.getPinCode()}`);
    console.log('====================================================\n');
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting remote server:', err);
});
