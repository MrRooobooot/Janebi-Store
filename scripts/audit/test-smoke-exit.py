#!/usr/bin/env python3
"""Real-browser negative control: an empty local page must fail the smoke CLI."""
import http.server
import os
from pathlib import Path
import subprocess
import threading


class EmptyPage(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/html')
        self.end_headers()
        self.wfile.write(b'<!doctype html><title>Negative test fixture</title>')

    def log_message(self, format, *args):
        pass


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]
    server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), EmptyPage)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    try:
        result = subprocess.run(
            ['node', 'scripts/audit/prod-guest-smoke.mjs'], cwd=root,
            env={**os.environ, 'SMOKE_BASE': f'http://127.0.0.1:{server.server_port}'},
            capture_output=True, text=True, timeout=120,
        )
        assert 'SMOKE: PROBLEMS FOUND' in result.stdout, result.stdout + result.stderr
        assert result.returncode != 0, 'Broken pages were reported but CLI exited successfully'
        print(f'PASS: empty-page failure propagated (exit={result.returncode})')
    finally:
        server.shutdown()
        server.server_close()
