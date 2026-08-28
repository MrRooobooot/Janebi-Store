#!/usr/bin/env python3
"""
Janebi VPS Autonomous Monitor
Runs locally on VPS via cron. Checks store health, disk usage, Docker containers,
and sends urgent alerts directly to Telegram webhook.
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import subprocess

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
HEALTH_URL = os.getenv("HEALTH_URL", "http://127.0.0.1:3000/api/health")

def send_telegram(message: str):
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"[LOG] {message}")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": f"🚨 [Janebi VPS Monitor]\n{message}",
        "parse_mode": "Markdown"
    }
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
    try:
        urllib.request.urlopen(req, timeout=10)
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}", file=sys.stderr)

def check_health():
    try:
        req = urllib.request.Request(HEALTH_URL, headers={'User-Agent': 'JanebiMonitor/1.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                return False, f"Status code: {response.status}"
            body = response.read().decode('utf-8')
            if 'ok' not in body.lower():
                return False, f"Response unexpected: {body[:100]}"
            return True, "OK"
    except Exception as e:
        return False, str(e)

def check_disk_space(threshold_percent=85):
    try:
        df = subprocess.check_output(["df", "-h", "/"]).decode("utf-8")
        lines = df.strip().split("\n")
        if len(lines) >= 2:
            usage_str = lines[1].split()[4].replace("%", "")
            usage = int(usage_str)
            if usage >= threshold_percent:
                return False, f"High disk usage: {usage}%"
            return True, f"{usage}%"
    except Exception as e:
        return False, f"Disk check error: {e}"
    return True, "OK"

def check_docker_containers():
    try:
        out = subprocess.check_output(["docker", "ps", "--filter", "name=janebi-store", "--format", "{{.Status}}"]).decode("utf-8").strip()
        if not out:
            return False, "Container 'janebi-store' is not running!"
        return True, out
    except Exception as e:
        return False, f"Docker check error: {e}"

def main():
    errors = []
    
    # 1. Health check
    healthy, h_msg = check_health()
    if not healthy:
        errors.append(f"• *App Health Down:* `{h_msg}`")
        
    # 2. Docker check
    docker_ok, d_msg = check_docker_containers()
    if not docker_ok:
        errors.append(f"• *Docker Container Error:* `{d_msg}`")
        
    # 3. Disk check
    disk_ok, disk_msg = check_disk_space()
    if not disk_ok:
        errors.append(f"• *Disk Warning:* `{disk_msg}`")

    if errors:
        alert_text = "\n".join(errors)
        send_telegram(alert_text)
        sys.exit(1)
    else:
        print("All systems operational.")

if __name__ == "__main__":
    main()
