#!/usr/bin/env python3
"""Agent status API for the live dashboard widget.
Emits one JSON line on each tick; the widget polls this file.
Deterministic, read-only, no LLM."""
import json, sqlite3, os, time, hashlib

HOME = os.path.expanduser("~")
DB = f"{HOME}/.hermes/profiles/code-pro/state.db"
JOBS = f"{HOME}/.hermes/profiles/code-pro/cron/jobs.json"
REPORTS_J = f"{HOME}/Desktop/Janebi-Store/.hermes/reports"
REPORTS_N = f"{HOME}/Documents/Personal/Novin Khodro/.hermes/reports"
OUT = f"{HOME}/Desktop/Janebi-Store/.hermes/agents-status.json"
EXEC_DB = f"{HOME}/.hermes/profiles/code-pro/cron/executions.db"

def sessions_summary():
    con = sqlite3.connect(f"file:{DB}?mode=ro", uri=True)
    cur = con.cursor()
    rows = cur.execute("""
        SELECT source, count(*), max(started_at) FROM sessions GROUP BY source
    """).fetchall()
    last = cur.execute("""
        SELECT id, source, message_count, started_at FROM sessions
        ORDER BY started_at DESC LIMIT 6
    """).fetchall()
    con.close()
    return {
        "by_source": {r[0]: r[1] for r in rows},
        "recent": [{"id": r[0], "src": r[1], "msgs": r[2],
                    "ago_s": int(time.time() - r[3])} for r in last],
    }

def _ts(v):
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        from datetime import datetime, timezone
        try:
            return datetime.fromisoformat(v).timestamp()
        except ValueError:
            return None
    return None

def jobs_status():
    d = json.load(open(JOBS))
    now = time.time()
    # execution state: a job with a 'running' execution = actively working right now
    # (stale rows: claimed > 20 min ago and still 'running' = crashed run, ignore)
    running = set()
    try:
        con = sqlite3.connect(EXEC_DB)
        con.execute("PRAGMA query_only=1")
        for jid, claimed in con.execute("SELECT job_id, claimed_at FROM executions WHERE status='running'"):
            try:
                from datetime import datetime
                age = now - datetime.fromisoformat(claimed).timestamp()
            except Exception:
                continue
            if age < 1200:
                running.add(jid)
        con.close()
    except Exception:
        pass
    out = []
    for j in d.get("jobs", []):
        nxt, last = _ts(j.get("next_run_at")), _ts(j.get("last_run_at"))
        is_running = j["id"] in running
        interval = None
        sched = j.get("schedule", {})
        if sched.get("kind") == "interval":
            interval = sched["minutes"] * 60
        out.append({
            "name": j.get("name"),
            "status": j.get("last_status"),
            "running": is_running,
            "last_run_ago_s": int(now - last) if last else None,
            "next_run_in_s": int(nxt - now) if nxt else None,
            "interval_s": interval,
            "enabled": j.get("enabled", False),
        })
    return out

def progress():
    # Completion % computed from TASKS.md checkbox density + audit P-items
    def scan(tasks_path):
        try:
            t = open(tasks_path).read()
        except Exception:
            return None
        done = t.count("- [x]") + t.count("[x]")
        todo = t.count("- [ ]") + t.count("[ ]")
        return {"done": done, "open": todo,
                "pct": round(100 * done / max(1, done + todo))}
    j_tasks = f"{HOME}/Desktop/Janebi-Store/TASKS.md"
    n_tasks = f"{HOME}/Documents/Personal/Novin Khodro/TASKS.md"
    reports = {"janebi": len(os.listdir(REPORTS_J)) if os.path.isdir(REPORTS_J) else 0,
               "novin": len(os.listdir(REPORTS_N)) if os.path.isdir(REPORTS_N) else 0}
    return {"janebi": scan(j_tasks), "novin": scan(n_tasks), "reports": reports}

def prod_health():
    import urllib.request
    def probe(url):
        try:
            r = urllib.request.urlopen(url, timeout=4)
            return r.status
        except Exception as e:
            return f"ERR"
    return {"janebi": probe("https://janebiarena.ir/api/health"),
            "novin": probe("http://185.231.183.51/")}

data = {
    "ts": int(time.time()),
    "jobs": jobs_status(),
    "sessions": sessions_summary(),
    "progress": progress(),
    "prod": prod_health(),
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
tmp = OUT + ".tmp"
json.dump(data, open(tmp, "w"), ensure_ascii=False)
os.replace(tmp, OUT)
print(json.dumps(data, ensure_ascii=False)[:200])
