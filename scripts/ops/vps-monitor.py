#!/usr/bin/env python3
"""Janebi VPS monitor — runs from cron every 5 minutes.

Alerts go to **Bale** (the operator's chat app) via the same bot that runs the
store, using BALE_BOT_TOKEN + BALE_ADMIN_CHAT_IDS. No parse_mode: Bale answers
500 to formatted payloads, so every alert is plain text.

Checks (each one has actually caught something or prevents a silent failure):
  1. app health  — /api/health must answer 200 with a DB-backed "ok"
  2. containers  — janebi-store + janebi-postgres running, and RestartCount delta
  3. disk        — root filesystem below threshold
  4. 5xx rate    — nginx access log, last 5 minutes
  5. backup age  — newest *.db under BACKUP_DIR must be younger than MAX_AGE_H
  6. fatal log   — container log mentions a module/syntax crash in the last run

Alert policy: state file remembers which checks were failing; an alert is sent
when a check STARTS failing, then re-sent at most every REMIND_S while it stays
broken, plus one "recovered" message when it clears. Cron every 5 min therefore
cannot spam the operator.
"""
import glob
import json
import os
import re
import subprocess
import sys
import time
import urllib.request

ENV_FILE = os.getenv("JANEBI_ENV_FILE", "/home/ubuntu/Janebi-Store/.env")
HEALTH_URL = os.getenv("HEALTH_URL", "http://127.0.0.1:3000/api/health")
BACKUP_DIR = os.getenv("BACKUP_DIR", "/home/ubuntu/backups")
MAX_AGE_H = float(os.getenv("MAX_BACKUP_AGE_HOURS", "30"))
DISK_THRESHOLD = int(os.getenv("DISK_THRESHOLD_PERCENT", "85"))
NGINX_ACCESS = os.getenv("NGINX_ACCESS_LOG", "/var/log/nginx/access.log")
STATE_FILE = os.getenv("MONITOR_STATE", "/home/ubuntu/.janebi-monitor-state.json")
REMIND_S = int(os.getenv("REMIND_SECONDS", str(6 * 3600)))
CONTAINERS = ["janebi-store", "janebi-postgres"]


def env_from_file(key):
    if os.getenv(key):
        return os.getenv(key, "")
    try:
        with open(ENV_FILE, encoding="utf-8") as fh:
            for line in fh:
                if line.startswith(key + "="):
                    return line.split("=", 1)[1].strip()
    except OSError:
        pass
    return ""


BOT_TOKEN = env_from_file("BALE_BOT_TOKEN")
CHAT_IDS = [c.strip() for c in env_from_file("BALE_ADMIN_CHAT_IDS").split(",") if c.strip()]


def bale_send(text: str) -> bool:
    """Plain-text alert to every configured admin chat."""
    if not BOT_TOKEN or not CHAT_IDS:
        print("[monitor] no Bale credentials — alert only logged:", text)
        return False
    ok = False
    for chat in CHAT_IDS:
        payload = json.dumps({"chat_id": int(chat) if chat.isdigit() else chat, "text": f"🚨 Janebi VPS\n{text}"}).encode()
        req = urllib.request.Request(
            f"https://tapi.bale.ai/bot{BOT_TOKEN}/sendMessage",
            data=payload,
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as res:
                body = json.loads(res.read().decode())
            ok = ok or bool(body.get("ok"))
            print(f"[monitor] alert -> {chat}: ok={body.get('ok')}")
        except Exception as exc:  # never let alerting break the monitor
            print(f"[monitor] alert to {chat} failed: {exc}", file=sys.stderr)
    return ok


def sh(cmd: list[str], sudo: bool = False) -> tuple[int, str]:
    if sudo:
        cmd = ["sudo", "-n"] + cmd
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=25)
        return out.returncode, (out.stdout or out.stderr).strip()
    except Exception as exc:
        return 1, str(exc)


def check_health():
    try:
        req = urllib.request.Request(HEALTH_URL, headers={"User-Agent": "JanebiMonitor/2.0"})
        with urllib.request.urlopen(req, timeout=8) as res:
            if res.status != 200:
                return f"HTTP {res.status}"
            body = json.loads(res.read().decode() or "{}")
            if body.get("status") != "ok" or body.get("database") != "ok":
                return f"payload: {json.dumps(body)[:120]}"
            return None
    except Exception as exc:
        return str(exc)


def check_containers():
    problems = []
    for name in CONTAINERS:
        code, out = sh(["docker", "inspect", "-f", "{{.State.Status}} {{.RestartCount}}", name])
        if code != 0:
            problems.append(f"{name}: not found ({out[:60]})")
            continue
        status, _, restarts = out.partition(" ")
        if status != "running":
            problems.append(f"{name}: {status}")
        if int(restarts or 0) > 0:
            problems.append(f"{name}: restarted {restarts}x since creation")
    return "; ".join(problems) or None


def check_disk():
    code, out = sh(["df", "-P", "/"])
    if code != 0:
        return f"df failed: {out[:60]}"
    m = re.search(r"(\d+)%", out.splitlines()[-1] if out else "")
    if not m:
        return f"unparsable df: {out[:60]}"
    used = int(m.group(1))
    return f"disk {used}% ≥ {DISK_THRESHOLD}%" if used >= DISK_THRESHOLD else None


def check_5xx(window_minutes=5):
    code, out = sh(["tail", "-n", "4000", NGINX_ACCESS], sudo=True)
    if code != 0:
        return None  # log not readable → not an alert (the cron runs as ubuntu)
    cutoff = time.strftime("%d/%b/%Y:%H:%M", time.localtime(time.time() - window_minutes * 60))
    hits, total = 0, 0
    for line in out.splitlines():
        m = re.search(r"\[([^\]]+)\] \"[^\"]*\" (\d{3}) ", line)
        if not m or m.group(1)[:16] < cutoff:
            continue
        total += 1
        if m.group(2).startswith("5"):
            hits += 1
    if hits >= 10:
        return f"{hits} × 5xx of {total} requests in {window_minutes}min"
    return None


def check_backup_age():
    files = [f for f in glob.glob(os.path.join(BACKUP_DIR, "*.db")) if os.path.getsize(f) > 0]
    if not files:
        return f"no backup file in {BACKUP_DIR}"
    newest = max(files, key=os.path.getmtime)
    age_h = (time.time() - os.path.getmtime(newest)) / 3600
    if age_h > MAX_AGE_H:
        return f"newest backup is {age_h:.1f}h old ({os.path.basename(newest)})"
    return None


def check_fatal_logs():
    code, out = sh(["docker", "logs", "--since", "10m", "janebi-store"])
    if code != 0 or not out:
        return None
    for pattern in ("Cannot find module", "UnhandledPromiseRejection", "SyntaxError"):
        if pattern in out:
            return f"container log: {pattern}"
    return None


CHECKS = {
    "app health": check_health,
    "containers": check_containers,
    "disk": check_disk,
    "5xx rate": check_5xx,
    "backup age": check_backup_age,
    "fatal logs": check_fatal_logs,
}


def load_state():
    try:
        with open(STATE_FILE, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return {}


def save_state(state):
    try:
        with open(STATE_FILE, "w", encoding="utf-8") as fh:
            json.dump(state, fh)
    except OSError as exc:
        print(f"[monitor] cannot write state: {exc}", file=sys.stderr)


def main():
    state = load_state()
    now = time.time()
    failures, recovered = {}, []

    for name, fn in CHECKS.items():
        try:
            problem = fn()
        except Exception as exc:  # a broken check must not crash the monitor
            problem = f"check error: {exc}"
        if problem:
            failures[name] = problem
            prev = state.get(name, {})
            if not prev.get("failing") or now - float(prev.get("last_alert", 0)) > REMIND_S:
                bale_send(f"⚠️ {name}: {problem}")
                state[name] = {"failing": True, "last_alert": now}
            else:
                state[name] = {**prev, "failing": True}
        elif state.get(name, {}).get("failing"):
            recovered.append(name)
            state[name] = {"failing": False, "last_alert": now}
            bale_send(f"✅ recovered: {name}")

    save_state(state)
    if failures:
        print("[monitor] failing:", json.dumps(failures, ensure_ascii=False))
        sys.exit(1)
    print(f"[monitor] all clear{' (recovered: ' + ', '.join(recovered) + ')' if recovered else ''}")


if __name__ == "__main__":
    main()
