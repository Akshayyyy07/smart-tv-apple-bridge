// Baron Smart TV Remote Frontend Controller

const statusPill = document.getElementById('status-pill');
const statusText = document.getElementById('status-text');

// Haptic feedback helper for mobile
function haptic(ms = 25) {
  if (window.navigator && window.navigator.vibrate) {
    try {
      window.navigator.vibrate(ms);
    } catch (e) {
      // ignore
    }
  }
}

// Send command to backend
async function sendCommand(command) {
  haptic(30);
  try {
    const res = await fetch('/api/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command }),
    });
    const data = await res.json();
    if (!data.success) {
      console.warn(`Command ${command} failed:`, data.error);
    }
  } catch (err) {
    console.error(`Network error sending ${command}:`, err);
  }
}

// Launch app
async function launchApp(app) {
  haptic(40);
  try {
    const res = await fetch('/api/app', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app }),
    });
    const data = await res.json();
    if (data.success) {
      pollStatus();
    }
  } catch (err) {
    console.error('Failed to launch app:', err);
  }
}

// Send text
async function sendText(text) {
  haptic(25);
  try {
    const res = await fetch('/api/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return (await res.json()).success;
  } catch (err) {
    console.error('Failed to send text:', err);
    return false;
  }
}

// Poll TV Status
async function pollStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.connected) {
      statusPill.className = 'status-pill connected';
      const volStr = data.muted ? 'MUTED' : `VOL ${data.volume}`;
      statusText.textContent = `${data.ip} • ${volStr}`;
    } else {
      statusPill.className = 'status-pill disconnected';
      statusText.textContent = 'Disconnected';
    }
  } catch (err) {
    statusPill.className = 'status-pill disconnected';
    statusText.textContent = 'Server Offline';
  }
}

// Bind button event listeners
function bindButtons() {
  const mapping = {
    'btn-power': 'power',
    'btn-up': 'up',
    'btn-down': 'down',
    'btn-left': 'left',
    'btn-right': 'right',
    'btn-ok': 'ok',
    'btn-home': 'home',
    'btn-back': 'back',
    'btn-menu': 'menu',
    'btn-vol-up': 'vol_up',
    'btn-vol-down': 'vol_down',
    'btn-mute': 'mute',
    'btn-ch-up': 'ch_up',
    'btn-ch-down': 'ch_down',
    'btn-input': 'input',
    'btn-play-pause': 'play_pause',
    'btn-rewind': 'rewind',
    'btn-stop': 'stop',
    'btn-ff': 'fast_forward',
  };

  Object.entries(mapping).forEach(([id, cmd]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        sendCommand(cmd);
      });
    }
  });

  // App buttons
  document.querySelectorAll('.app-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const appName = btn.getAttribute('data-app');
      if (appName) {
        launchApp(appName);
      }
    });
  });
}

// Keyboard shortcuts for Mac / PC desktop users
function bindKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Ignore if modal is open with active input
    if (document.activeElement && document.activeElement.tagName === 'INPUT') {
      return;
    }

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        sendCommand('up');
        break;
      case 'ArrowDown':
        e.preventDefault();
        sendCommand('down');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        sendCommand('left');
        break;
      case 'ArrowRight':
        e.preventDefault();
        sendCommand('right');
        break;
      case 'Enter':
        e.preventDefault();
        sendCommand('ok');
        break;
      case 'Escape':
      case 'Backspace':
        e.preventDefault();
        sendCommand('back');
        break;
      case 'Home':
        e.preventDefault();
        sendCommand('home');
        break;
      case ' ':
        e.preventDefault();
        sendCommand('play_pause');
        break;
      case '+':
      case '=':
        e.preventDefault();
        sendCommand('vol_up');
        break;
      case '-':
      case '_':
        e.preventDefault();
        sendCommand('vol_down');
        break;
      case 'm':
      case 'M':
        e.preventDefault();
        sendCommand('mute');
        break;
      case 's':
      case 'S':
        e.preventDefault();
        sendCommand('input');
        break;
    }
  });
}

// Modals Handling
function setupModals() {
  // Text Typing Modal
  const keyboardModal = document.getElementById('keyboard-modal');
  const btnKeyboard = document.getElementById('btn-keyboard');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const keyboardInput = document.getElementById('keyboard-input');
  const btnSendText = document.getElementById('btn-send-text');
  const btnClearText = document.getElementById('btn-clear-text');

  btnKeyboard.addEventListener('click', () => {
    keyboardModal.classList.add('active');
    setTimeout(() => keyboardInput.focus(), 100);
  });

  btnCloseModal.addEventListener('click', () => keyboardModal.classList.remove('active'));
  btnClearText.addEventListener('click', () => {
    keyboardInput.value = '';
    keyboardInput.focus();
  });

  btnSendText.addEventListener('click', async () => {
    const val = keyboardInput.value.trim();
    if (val) {
      await sendText(val);
      keyboardInput.value = '';
      keyboardModal.classList.remove('active');
    }
  });

  keyboardInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const val = keyboardInput.value.trim();
      if (val) {
        await sendText(val);
        keyboardInput.value = '';
        keyboardModal.classList.remove('active');
      }
    }
  });

  // Screen Preview Modal
  const previewModal = document.getElementById('preview-modal');
  const btnPreview = document.getElementById('btn-preview');
  const btnClosePreview = document.getElementById('btn-close-preview');
  const btnRefreshScreen = document.getElementById('btn-refresh-screen');
  const screenImg = document.getElementById('screen-img');
  const screenLoading = document.getElementById('screen-loading');

  function loadScreenshot() {
    screenLoading.style.display = 'block';
    screenImg.style.display = 'none';
    const newImg = new Image();
    newImg.src = `/api/screenshot?t=${Date.now()}`;
    newImg.onload = () => {
      screenImg.src = newImg.src;
      screenLoading.style.display = 'none';
      screenImg.style.display = 'block';
    };
    newImg.onerror = () => {
      screenLoading.textContent = 'Failed to load screen capture.';
    };
  }

  btnPreview.addEventListener('click', () => {
    previewModal.classList.add('active');
    loadScreenshot();
  });

  btnRefreshScreen.addEventListener('click', loadScreenshot);
  btnClosePreview.addEventListener('click', () => previewModal.classList.remove('active'));

  // QR Code Modal
  const qrModal = document.getElementById('qr-modal');
  const btnShowQr = document.getElementById('btn-show-qr');
  const btnCloseQr = document.getElementById('btn-close-qr');
  const qrImg = document.getElementById('qr-img');
  const qrUrl = document.getElementById('qr-url');

  btnShowQr.addEventListener('click', async () => {
    qrModal.classList.add('active');
    try {
      const res = await fetch('/api/qr');
      const data = await res.json();
      qrImg.src = data.qrCodeDataUrl;
      qrUrl.textContent = data.url;
    } catch {
      qrUrl.textContent = window.location.href;
    }
  });

  btnCloseQr.addEventListener('click', () => qrModal.classList.remove('active'));

  // Apple HomeKit Modal
  const homekitModal = document.getElementById('homekit-modal');
  const btnShowHomekit = document.getElementById('btn-show-homekit');
  const btnCloseHomekit = document.getElementById('btn-close-homekit');
  const homekitQrImg = document.getElementById('homekit-qr-img');
  const homekitPin = document.getElementById('homekit-pin');

  if (btnShowHomekit) {
    btnShowHomekit.addEventListener('click', async () => {
      homekitModal.classList.add('active');
      try {
        const res = await fetch('/api/homekit');
        const data = await res.json();
        homekitQrImg.src = data.qrCodeDataUrl;
        homekitPin.textContent = data.pincode;
      } catch (err) {
        console.error('Failed to load HomeKit info:', err);
      }
    });
  }

  if (btnCloseHomekit) {
    btnCloseHomekit.addEventListener('click', () => homekitModal.classList.remove('active'));
  }

  // Close modals on clicking overlay background
  [keyboardModal, previewModal, qrModal, homekitModal].forEach((m) => {
    if (m) {
      m.addEventListener('click', (e) => {
        if (e.target === m) m.classList.remove('active');
      });
    }
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  bindButtons();
  bindKeyboardShortcuts();
  setupModals();
  pollStatus();
  setInterval(pollStatus, 3000);
});
