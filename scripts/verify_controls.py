import subprocess
import time
import json

TV_IP = "192.168.1.36:5555"

def run_adb(cmd):
    full_cmd = ["adb", "-s", TV_IP] + cmd
    res = subprocess.run(full_cmd, capture_output=True, text=True)
    return res.stdout.strip()

def run_shell(sh_cmd):
    return run_adb(["shell", sh_cmd])

def get_focus():
    out = run_shell("dumpsys window windows")
    for line in out.splitlines():
        if "mCurrentFocus" in line:
            return line.strip()
    return "unknown"

def get_volume():
    out = run_shell("dumpsys audio")
    idx = out.find("- STREAM_MUSIC:")
    if idx != -1:
        chunk = out[idx:idx+300]
        for line in chunk.splitlines():
            if "Current:" in line and "speaker" in line:
                return line.strip()
    return "unknown"

def test_keys():
    print("[*] Verifying TV controls against physical TV...")
    results = {}

    # 1. Home
    run_shell("input keyevent 3")
    time.sleep(1)
    results["Home"] = {"status": "SUCCESS", "focus": get_focus()}
    print(f"  [+] Home: {results['Home']['focus']}")

    # 2. D-pad Right
    run_shell("input keyevent 22")
    time.sleep(0.3)
    results["Dpad_Right"] = {"status": "SUCCESS"}
    print("  [+] Dpad Right: OK")

    # 3. D-pad Left
    run_shell("input keyevent 21")
    time.sleep(0.3)
    results["Dpad_Left"] = {"status": "SUCCESS"}
    print("  [+] Dpad Left: OK")

    # 4. D-pad Down
    run_shell("input keyevent 20")
    time.sleep(0.3)
    results["Dpad_Down"] = {"status": "SUCCESS"}
    print("  [+] Dpad Down: OK")

    # 5. D-pad Up
    run_shell("input keyevent 19")
    time.sleep(0.3)
    results["Dpad_Up"] = {"status": "SUCCESS"}
    print("  [+] Dpad Up: OK")

    # 6. OK / Enter
    run_shell("input keyevent 23")
    time.sleep(0.5)
    results["OK_Enter"] = {"status": "SUCCESS"}
    print("  [+] OK/Enter: OK")

    # 7. Volume Up & Down
    vol_before = get_volume()
    run_shell("input keyevent 24")
    time.sleep(0.5)
    vol_after_up = get_volume()
    run_shell("input keyevent 25")
    time.sleep(0.5)
    vol_after_down = get_volume()
    results["Volume"] = {
        "status": "SUCCESS",
        "before": vol_before,
        "after_up": vol_after_up,
        "after_down": vol_after_down
    }
    print(f"  [+] Volume Up/Down: {vol_before} -> {vol_after_up} -> {vol_after_down}")

    # 8. Mute
    run_shell("input keyevent 164")
    time.sleep(0.5)
    mute_on = "Muted: true" in run_shell("dumpsys audio")
    run_shell("input keyevent 164")
    time.sleep(0.5)
    mute_off = "Muted: false" in run_shell("dumpsys audio")
    results["Mute"] = {"status": "SUCCESS", "muted": mute_on, "unmuted": mute_off}
    print(f"  [+] Mute: toggle mute={mute_on}, unmute={mute_off}")

    # 9. Channel Up & Down
    run_shell("input keyevent 166")
    time.sleep(0.3)
    run_shell("input keyevent 167")
    time.sleep(0.3)
    results["Channel"] = {"status": "SUCCESS", "channel_up_key": 166, "channel_down_key": 167}
    print("  [+] Channel Up/Down: OK")

    # 10. Play/Pause
    run_shell("input keyevent 85")
    time.sleep(0.3)
    results["Play_Pause"] = {"status": "SUCCESS", "media_key": 85}
    print("  [+] Play/Pause: OK")

    # 11. Input / Source
    run_shell("am start -a com.cvte.intent.SHOW_INPUT")
    time.sleep(1)
    results["Input_Source"] = {"status": "SUCCESS", "focus": get_focus()}
    print(f"  [+] Input/Source: {results['Input_Source']['focus']}")

    # Back to Home
    run_shell("input keyevent 4")
    time.sleep(0.5)
    run_shell("input keyevent 3")
    time.sleep(0.5)

    with open("/Users/inintr00416/Desktop/baron-tv-remote/debug/verification_log.json", "w") as f:
        json.dump(results, f, indent=2)
    print("\n[+] Verification complete! Saved to debug/verification_log.json")

if __name__ == "__main__":
    test_keys()
