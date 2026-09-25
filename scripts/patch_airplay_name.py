import zipfile
import hashlib
import zlib
import struct
import subprocess
import os
from custom_zipalign import align_apk

INPUT_APK = "/Users/inintr00416/Desktop/baron-tv-remote/debug/iMirror-armeabi-v7a.apk"
UNALIGNED_APK = "/Users/inintr00416/Desktop/baron-tv-remote/debug/iMirror-unaligned.apk"
OUTPUT_APK = "/Users/inintr00416/Desktop/baron-tv-remote/debug/iMirror-BaronSmartTV.apk"
KEYSTORE = "/Users/inintr00416/Desktop/baron-tv-remote/debug/debug.keystore"
TV_SERIAL = "192.168.1.36:5555"

TARGET_STRING = b"Pratik AirPlay"
NEW_STRING = b"Baron Smart TV"

print(f"[*] Patching '{TARGET_STRING.decode()}' -> '{NEW_STRING.decode()}'...")

with zipfile.ZipFile(INPUT_APK, 'r') as zin:
    dex = bytearray(zin.read('classes.dex'))

idx = dex.find(TARGET_STRING)
assert idx != -1, "Target string not found!"

# Replace string
dex[idx:idx+len(TARGET_STRING)] = NEW_STRING
print(f"  [+] Replaced string at offset {idx}")

# Recompute SHA-1 signature
calc_sig = hashlib.sha1(dex[32:]).digest()
dex[12:32] = calc_sig

# Recompute Adler32 checksum
calc_checksum = zlib.adler32(dex[12:]) & 0xffffffff
dex[8:12] = struct.pack('<I', calc_checksum)
print(f"  [+] Recomputed DEX signature & Adler32 checksum ({hex(calc_checksum)})")

# Step 1: Write unaligned APK with patched DEX (strip old signatures)
print(f"[*] Step 1: Writing unaligned APK to {UNALIGNED_APK}...")
with zipfile.ZipFile(INPUT_APK, 'r') as zin:
    with zipfile.ZipFile(UNALIGNED_APK, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            if item.filename.startswith('META-INF/'):
                continue
            if item.filename == 'classes.dex':
                zout.writestr(item, bytes(dex))
            elif item.filename.endswith('.so'):
                zout.writestr(item, zin.read(item.filename), compress_type=zipfile.ZIP_STORED)
            else:
                zout.writestr(item, zin.read(item.filename), compress_type=item.compress_type)

# Step 2: Sign with jarsigner BEFORE alignment
print("[*] Step 2: Signing unaligned APK with jarsigner...")
sign_cmd = [
    "jarsigner",
    "-sigalg", "SHA256withRSA",
    "-digestalg", "SHA-256",
    "-keystore", KEYSTORE,
    "-storepass", "android",
    UNALIGNED_APK,
    "debugkey"
]
subprocess.run(sign_cmd, check=True, stdout=subprocess.DEVNULL)
print("  [✔] APK signed with v1 signature!")

# Step 3: Page-align to 4096 bytes (preserves v1 jarsigner signatures)
print(f"[*] Step 3: Page-aligning to {OUTPUT_APK}...")
align_apk(UNALIGNED_APK, OUTPUT_APK)

# Step 4: Deploy to Baron TV
print(f"[*] Step 4: Deploying to Baron TV ({TV_SERIAL})...")
subprocess.run(["adb", "-s", TV_SERIAL, "shell", "pm", "uninstall", "dev.imirror.receiver"], capture_output=True)
res = subprocess.run(["adb", "-s", TV_SERIAL, "install", "-r", OUTPUT_APK], capture_output=True, text=True)
print(f"  Install result: {res.stdout.strip()} {res.stderr.strip()}")

if "Success" in res.stdout:
    print("[*] Launching Baron Smart TV AirPlay service...")
    subprocess.run(["adb", "-s", TV_SERIAL, "shell", "am", "start", "-n", "dev.imirror.receiver/.MainActivity"], capture_output=True)
    subprocess.run(["adb", "-s", TV_SERIAL, "shell", "input", "keyevent", "3"], capture_output=True)
    print("\n🎉 SUCCESS! AirPlay is now installed and broadcasting as 'Baron Smart TV'!")
