import subprocess
import socket
import concurrent.futures
import re
import sys
import time

TARGET_WIFI_MAC = "3b:be:a8:9f:06:55".lower()
TARGET_WIRED_MAC = "e0:27:6c:7b:ea:e9".lower()

def ping_ip(ip):
    try:
        # ping with 0.2s timeout, 1 packet
        res = subprocess.run(
            ["ping", "-c", "1", "-W", "300", ip],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )
        return ip, res.returncode == 0
    except Exception:
        return ip, False

def sweep_subnet(base="192.168.1."):
    print(f"[*] Sweeping {base}1 - {base}254...")
    ips = [f"{base}{i}" for i in range(1, 255)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        results = list(executor.map(ping_ip, ips))
    active = [ip for ip, ok in results if ok]
    print(f"[*] Ping sweep completed. {len(active)} responsive hosts.")
    return active

def get_arp_table():
    res = subprocess.run(["arp", "-a", "-n"], capture_output=True, text=True)
    entries = []
    # format: ? (192.168.1.1) at b8:dd:71:b2:e1:94 on en0 ifscope [ethernet]
    pattern = re.compile(r'\?\s+\(([0-9.]+)\)\s+at\s+([0-9a-fA-F:]+)')
    for line in res.stdout.splitlines():
        m = pattern.search(line)
        if m:
            ip = m.group(1)
            raw_mac = m.group(2).lower()
            # Normalize mac to 2 digits per octet: e.g. 3e:eb:d1:c9:83:e -> 3e:eb:d1:c9:83:0e
            parts = raw_mac.split(':')
            if len(parts) == 6:
                norm_mac = ':'.join(p.zfill(2) for p in parts)
                entries.append((ip, norm_mac, line.strip()))
    return entries

def ssdp_discover(timeout=3):
    print("[*] Performing SSDP discovery...")
    msg = (
        'M-SEARCH * HTTP/1.1\r\n'
        'HOST: 239.255.255.250:1900\r\n'
        'MAN: "ssdp:discover"\r\n'
        'MX: 2\r\n'
        'ST: ssdp:all\r\n'
        '\r\n'
    ).encode('utf-8')

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    s.settimeout(timeout)
    
    responses = []
    try:
        s.sendto(msg, ('239.255.255.250', 1900))
        start = time.time()
        while time.time() - start < timeout:
            try:
                data, addr = s.recvfrom(65507)
                responses.append((addr[0], data.decode('utf-8', errors='ignore')))
            except socket.timeout:
                break
            except Exception as e:
                break
    finally:
        s.close()
    return responses

def main():
    sweep_subnet("192.168.1.")
    arp_entries = get_arp_table()
    
    print("\n--- ARP Table Entries ---")
    matched_tv = None
    for ip, mac, raw in arp_entries:
        match_str = ""
        if mac == TARGET_WIFI_MAC:
            match_str = " <--- MATCHES BARON TV WI-FI MAC!"
            matched_tv = (ip, mac, "Wi-Fi")
        elif mac == TARGET_WIRED_MAC:
            match_str = " <--- MATCHES BARON TV WIRED MAC!"
            matched_tv = (ip, mac, "Wired")
        print(f"IP: {ip:<15} MAC: {mac:<17} {match_str}")

    if matched_tv:
        print(f"\n[+] SUCCESS! Baron TV found at IP: {matched_tv[0]} ({matched_tv[2]} MAC: {matched_tv[1]})")
    else:
        print("\n[-] TV MAC not immediately found in ARP. Let's inspect SSDP responses...")
        ssdp_res = ssdp_discover()
        for ip, text in ssdp_res:
            print(f"SSDP Response from {ip}:")
            for l in text.splitlines()[:5]:
                print(f"  {l}")

if __name__ == "__main__":
    main()
