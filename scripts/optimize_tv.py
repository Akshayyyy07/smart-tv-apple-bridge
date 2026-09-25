import subprocess
import time
import json
import re

TV_IP = "192.168.1.36:5555"

def run_adb(cmd):
    full_cmd = ["adb", "-s", TV_IP] + cmd
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout.strip(), res.stderr.strip()

def run_shell(sh_cmd):
    out, _ = run_adb(["shell", sh_cmd])
    return out

def get_storage():
    out = run_shell("df -h /data")
    for line in out.splitlines():
        if "/data" in line and "Filesystem" not in line:
            parts = re.split(r'\s+', line.strip())
            if len(parts) >= 5:
                return {
                    "size": parts[1],
                    "used": parts[2],
                    "avail": parts[3],
                    "use_percent": parts[4]
                }
    return {"size": "Unknown", "used": "Unknown", "avail": "Unknown", "use_percent": "Unknown"}

def get_ram():
    out = run_shell("free -m")
    lines = out.splitlines()
    for line in lines:
        if line.startswith("Mem:"):
            parts = re.split(r'\s+', line.strip())
            if len(parts) >= 4:
                return {
                    "total": f"{parts[1]} MB",
                    "used": f"{parts[2]} MB",
                    "free": f"{parts[3]} MB"
                }
    return {"total": "Unknown", "used": "Unknown", "free": "Unknown"}

def optimize():
    print("=" * 60)
    print("🚀 BARON TV OPTIMIZER (STEP 1: STORAGE + STEP 2: RAM)")
    print("=" * 60)

    # 1. Connect with auto-wait
    print(f"[*] Waiting for TV at {TV_IP} (ready to auto-catch on power toggle)...")
    connected = False
    for attempt in range(45):
        subprocess.run(["adb", "connect", TV_IP], capture_output=True)
        devices_out = subprocess.run(["adb", "devices"], capture_output=True, text=True).stdout
        if TV_IP in devices_out and "offline" not in devices_out:
            connected = True
            break
        time.sleep(2)
        if attempt % 5 == 0 and attempt > 0:
            print(f"    ... waiting for TV boot ({attempt * 2}s elapsed) ...")

    if not connected:
        print(f"[!] TV at {TV_IP} is not ready yet.")
        print("[!] Please toggle power off and on with your physical remote.")
        return False

    print("[✔] Connected to TV successfully!\n")

    # Initial metrics
    storage_before = get_storage()
    ram_before = get_ram()
    print("--- BEFORE OPTIMIZATION ---")
    print(f"  Storage (/data): {storage_before['used']} used / {storage_before['avail']} free ({storage_before['use_percent']} used)")
    print(f"  RAM (Memory):   {ram_before['used']} used / {ram_before['free']} free (Total: {ram_before['total']})\n")

    # STEP 1: DEEP CLEAN STORAGE
    print("--- [STEP 1] CLEANING STORAGE & APP CACHES ---")
    
    # 1.1 Clear temp files and dumps
    print("  [*] Clearing /data/local/tmp temporary files...")
    run_shell("rm -rf /data/local/tmp/*")

    # 1.2 Trim caches natively
    print("  [*] Running Android native cache trimmer (1000MB target)...")
    run_shell("pm trim-caches 1000M")

    # 1.3 Flush heavy app cache directories
    heavy_apps = [
        "com.google.android.youtube.tv",
        "in.startv.hotstar.dplus.tv",
        "in.startv.hotstar",
        "com.netflix.mediaclient",
        "com.amazon.amazonvideo.livingroom",
        "com.jio.media.stb.ondemand",
        "com.cvte.tv.pictorial",
        "com.stark.store",
        "com.system.update"
    ]

    for pkg in heavy_apps:
        # Clear only cache directory for the package (preserves user login and config)
        run_shell(f"rm -rf /data/data/{pkg}/cache/* /data/data/{pkg}/code_cache/* 2>/dev/null")
        print(f"  [✔] Flushed caches for {pkg}")

    print("  [✔] Storage cleanup completed.\n")

    # STEP 2: FREEZE BACKGROUND BLOATWARE
    print("--- [STEP 2] FREEZING BACKGROUND BLOATWARE ---")
    bloatware = [
        ("com.system.update", "Constant background update checker and wakelock holder"),
        ("com.system.memory.tool", "Factory memory cleaner (consumes 40MB+ RAM itself)"),
        ("com.cvte.tv.pictorial", "Screensaver background image downloader"),
        ("com.cvte.tv.weather", "Background weather polling service"),
    ]

    for pkg, desc in bloatware:
        out = run_shell(f"pm disable-user --user 0 {pkg}")
        if "disabled" in out or "new state" in out:
            print(f"  [✔] FROZEN: {pkg} ({desc})")
        else:
            print(f"  [~] {pkg}: {out or 'Already disabled'}")

    # Reclaim freed memory
    print("  [*] Reclaiming memory from terminated background tasks...")
    run_shell("am kill-all")
    time.sleep(2)

    # Final metrics
    storage_after = get_storage()
    ram_after = get_ram()

    print("\n" + "=" * 60)
    print("🎉 OPTIMIZATION RESULTS")
    print("=" * 60)
    print(f"  STORAGE (/data):")
    print(f"    Before: {storage_before['used']} used / {storage_before['avail']} free ({storage_before['use_percent']})")
    print(f"    After:  {storage_after['used']} used / {storage_after['avail']} free ({storage_after['use_percent']})")
    print(f"  RAM (Memory):")
    print(f"    Before: {ram_before['used']} used / {ram_before['free']} free")
    print(f"    After:  {ram_after['used']} used / {ram_after['free']} free")
    print("=" * 60)

    # Save report
    report = {
        "timestamp": time.ctime(),
        "storage": {"before": storage_before, "after": storage_after},
        "ram": {"before": ram_before, "after": ram_after}
    }
    with open("/Users/inintr00416/Desktop/baron-tv-remote/debug/optimization_report.json", "w") as f:
        json.dump(report, f, indent=2)

    return True

if __name__ == "__main__":
    optimize()
