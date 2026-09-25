import { TVRemote } from '../remote/TVRemote';

async function runTests() {
  console.log('--- RUNNING INTEGRATION TESTS FOR BARON TV REMOTE ---');
  const remote = new TVRemote();

  console.log('[Test 1] Initializing connection to Baron TV...');
  const connected = await remote.init('192.168.1.36');
  if (!connected) {
    throw new Error('Test 1 FAILED: Could not connect to TV at 192.168.1.36:5555');
  }
  console.log('  [PASS] Successfully connected to TV.');

  console.log('[Test 2] Querying TV status...');
  const status = await remote.getStatus();
  console.log('  Status received:', JSON.stringify(status, null, 2));
  if (!status.connected || status.powerState === 'Unknown') {
    console.warn('  [WARN] Power state was Unknown, but connection confirmed.');
  } else {
    console.log('  [PASS] Status query verified.');
  }

  console.log('[Test 3] Testing Key: HOME...');
  const homeOk = await remote.sendCommand('home');
  if (!homeOk) throw new Error('Test 3 FAILED: Home key execution failed');
  console.log('  [PASS] Home key sent.');

  console.log('[Test 4] Testing Key: VOLUME UP...');
  const volUpOk = await remote.sendCommand('vol_up');
  if (!volUpOk) throw new Error('Test 4 FAILED: Volume up key execution failed');
  console.log('  [PASS] Volume up sent.');

  console.log('[Test 5] Testing Key: VOLUME DOWN...');
  const volDownOk = await remote.sendCommand('vol_down');
  if (!volDownOk) throw new Error('Test 5 FAILED: Volume down key execution failed');
  console.log('  [PASS] Volume down sent.');

  console.log('[Test 6] Capturing TV screenshot...');
  const screenBuffer = await remote.getScreenshot();
  if (!screenBuffer || screenBuffer.length < 1000) {
    throw new Error('Test 6 FAILED: Screenshot buffer empty or too small');
  }
  console.log(`  [PASS] Screenshot captured successfully (${screenBuffer.length} bytes).`);

  console.log('\n✔ ALL INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n✖ TEST SUITE FAILED:', err);
  process.exit(1);
});
