#!/usr/bin/env python3
"""Verify /car-api location inside crm_nginx and fix if needed."""

from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

SECRETS = Path(__file__).resolve().parents[1] / ".deploy_secrets_full.json"

REMOTE = r'''
python3 <<'PY'
from pathlib import Path
import subprocess

def sh(cmd):
    return subprocess.run(cmd, shell=True, capture_output=True, text=True)

conf = Path("/opt/crm/nginx/conf.d/default.conf")
text = conf.read_text()
print("=== host conf car-api count ===", text.count("location /car-api/"))
# show surrounding context
idx = 0
while True:
    i = text.find("location /car-api/", idx)
    if i < 0:
        break
    print("--- at", i, "---")
    print(text[max(0,i-80):i+350])
    idx = i + 1

print("=== container conf ===")
r = sh("docker exec crm_nginx cat /etc/nginx/conf.d/default.conf")
ct = r.stdout or ""
print("container car-api count", ct.count("location /car-api/"))
print("container same?", ct == text)

print("=== curl from inside nginx container ===")
# try host.docker.internal / bridge / gateway
for url in [
    "http://172.16.0.1:8787/health",
    "http://host.docker.internal:8787/health",
]:
    r = sh(f"docker exec crm_nginx wget -qO- -T 3 {url} 2>&1 || docker exec crm_nginx curl -sS -m 3 {url} 2>&1")
    print(url, "->", (r.stdout or r.stderr)[:200])

print("=== curl via nginx inside (https localhost) ===")
r = sh("docker exec crm_nginx wget -qO- -T 5 --no-check-certificate https://127.0.0.1/car-api/health --header='Host: chatcrm.grupostravel.com' 2>&1 | head -c 200")
print("wget:", (r.stdout or r.stderr)[:300])
r = sh("docker exec crm_nginx sh -c \"command -v curl && curl -sk -m 5 -H 'Host: chatcrm.grupostravel.com' https://127.0.0.1/car-api/health\"")
print("curl:", (r.stdout or r.stderr)[:300])

# nginx -T show effective
r = sh("docker exec crm_nginx nginx -T 2>/dev/null | grep -n 'car-api' | head -20")
print("nginx -T car-api lines:", r.stdout)

# force restart container nginx
print("=== restart reload ===")
r = sh("docker exec crm_nginx nginx -s reload")
print("reload", r.returncode, r.stderr)
import time; time.sleep(1)
r = sh("curl -sk -m 8 -o /tmp/h.txt -w '%{http_code}' https://chatcrm.grupostravel.com/car-api/health")
body = Path("/tmp/h.txt").read_text(errors="replace")[:150]
print("public", r.stdout.strip(), repr(body))
print("VERIFY_DONE")
PY
'''


def main() -> int:
    sec = json.loads(SECRETS.read_text(encoding="utf-8"))
    target = f"{sec['ssh_user']}@{sec['host']}"
    pw = sec["ssh_pass"]
    b64 = base64.b64encode(REMOTE.encode()).decode("ascii")
    remote = f"echo {b64} | base64 -d > /tmp/v.sh && bash /tmp/v.sh"
    cmd = ["plink", "-batch", "-ssh", target, "-pw", pw, remote]
    safe, skip = [], False
    for p in cmd:
        if skip:
            safe.append("***"); skip = False; continue
        if p in ("-pw", "-password"):
            safe.append(p); skip = True; continue
        safe.append(p)
    print("+", " ".join(safe))
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=90)
    print(p.stdout[-14000:] if p.stdout else "(no out)")
    if p.stderr:
        print(p.stderr[-1000:], file=sys.stderr)
    return 0 if "VERIFY_DONE" in (p.stdout or "") else 1


if __name__ == "__main__":
    raise SystemExit(main())
