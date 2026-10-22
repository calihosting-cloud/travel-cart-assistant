#!/usr/bin/env python3
"""
1) Bind carrito-gt-api to 0.0.0.0:8787 (reachable from crm_nginx via 172.16.0.1)
2) Insert location /car-api/ in /opt/crm/nginx/conf.d/default.conf (before location /)
3) Reload crm_nginx and verify https://chatcrm.../car-api/health
"""

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
import re, subprocess, shutil

def sh(cmd, check=True):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise SystemExit(f"CMD_FAIL: {cmd}\n{r.stdout}\n{r.stderr}")
    return r

print("=== 1) bind uvicorn 0.0.0.0 ===")
unit = Path("/etc/systemd/system/carrito-gt-api.service")
if not unit.exists():
    raise SystemExit("NO_UNIT")
ut = unit.read_text()
print("unit before bind line:")
for line in ut.splitlines():
    if "ExecStart" in line or "Environment" in line or "WorkingDirectory" in line:
        print(" ", line)
# common patterns: --host 127.0.0.1 or uvicorn ... 
ut2 = ut
ut2 = ut2.replace("--host 127.0.0.1", "--host 0.0.0.0")
ut2 = ut2.replace("--host=127.0.0.1", "--host=0.0.0.0")
ut2 = re.sub(r"(uvicorn[^\n]*?)(\s+127\.0\.0\.1:8787)", r"\1 0.0.0.0:8787", ut2)
if "0.0.0.0" not in ut2 and "--host" not in ut2:
    # inject --host 0.0.0.0 before --port if present
    if "--port" in ut2:
        ut2 = ut2.replace("--port", "--host 0.0.0.0 --port")
    elif "uvicorn" in ut2:
        ut2 = re.sub(r"(ExecStart=.*uvicorn\s+\S+)", r"\1 --host 0.0.0.0", ut2)
if ut2 != ut:
    unit.write_text(ut2)
    sh("systemctl daemon-reload")
    sh("systemctl restart carrito-gt-api")
    print("UNIT_UPDATED")
else:
    print("UNIT_UNCHANGED (checking listen)")
    # still restart if currently on 127.0.0.1
    r = sh("ss -lntp | grep 8787 || true", check=False)
    print(r.stdout.strip())
    if "127.0.0.1:8787" in (r.stdout or "") and "0.0.0.0:8787" not in (r.stdout or ""):
        # force via drop-in
        d = Path("/etc/systemd/system/carrito-gt-api.service.d")
        d.mkdir(parents=True, exist_ok=True)
        # read ExecStart
        m = re.search(r"^ExecStart=(.+)$", ut, re.M)
        if not m:
            raise SystemExit("NO_EXECSTART")
        exe = m.group(1).strip()
        if "--host" not in exe:
            exe = exe + " --host 0.0.0.0"
        else:
            exe = exe.replace("127.0.0.1", "0.0.0.0")
        (d / "override.conf").write_text("[Service]\nExecStart=\nExecStart=%s\n" % exe)
        sh("systemctl daemon-reload")
        sh("systemctl restart carrito-gt-api")
        print("OVERRIDE_APPLIED")

import time
time.sleep(1)
r = sh("ss -lntp | grep 8787 || true", check=False)
print("listen:", r.stdout.strip())
r = sh("curl -sS -m 5 http://127.0.0.1:8787/health", check=False)
print("health:", r.stdout.strip())

print("=== 2) patch nginx default.conf ===")
conf = Path("/opt/crm/nginx/conf.d/default.conf")
text = conf.read_text()
bak = conf.with_suffix(".conf.bak-carapi")
if not bak.exists():
    bak.write_text(text)
    print("BAK", bak)

SNIP = """
    # Carrito GT API (host uvicorn via docker bridge)
    location /car-api/ {
        proxy_pass http://172.16.0.1:8787/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 20M;
    }
"""

if "location /car-api/" in text:
    print("ALREADY_HAS_CAR_API")
else:
    # insert before every `location / {` (HTTP + HTTPS)
    parts = text.split("    location / {")
    if len(parts) < 2:
        raise SystemExit("NO_LOCATION_ROOT")
    new = parts[0]
    for i, rest in enumerate(parts[1:]):
        new += SNIP + "    location / {" + rest
    conf.write_text(new)
    print("PATCHED", conf)

print("=== 3) nginx test + reload ===")
r = sh("docker exec crm_nginx nginx -t", check=False)
print(r.stdout)
print(r.stderr)
if r.returncode != 0:
    conf.write_text(bak.read_text() if bak.exists() else text)
    raise SystemExit("NGINX_TEST_FAIL")
sh("docker exec crm_nginx nginx -s reload", check=False)

print("=== 4) verify ===")
for label, cmd in [
    ("bridge", "curl -sS -m 5 http://172.16.0.1:8787/health"),
    ("https_public", "curl -sk -m 8 -o /tmp/car_h.txt -w '%{http_code}' https://chatcrm.grupostravel.com/car-api/health"),
]:
    r = sh(cmd, check=False)
    body = ""
    if label == "https_public":
        body = Path("/tmp/car_h.txt").read_text(errors="replace")[:120]
        print(f"{label} code={r.stdout.strip()} body={body!r}")
    else:
        print(f"{label} {r.stdout.strip()!r} rc={r.returncode}")

print("PATCH_DONE")
PY
'''


def main() -> int:
    sec = json.loads(SECRETS.read_text(encoding="utf-8"))
    target = f"{sec['ssh_user']}@{sec['host']}"
    pw = sec["ssh_pass"]
    b64 = base64.b64encode(REMOTE.encode()).decode("ascii")
    remote = f"echo {b64} | base64 -d > /tmp/patch_carapi.sh && bash /tmp/patch_carapi.sh"
    cmd = ["plink", "-batch", "-ssh", target, "-pw", pw, remote]
    safe, skip = [], False
    for p in cmd:
        if skip:
            safe.append("***")
            skip = False
            continue
        if p in ("-pw", "-password"):
            safe.append(p)
            skip = True
            continue
        safe.append(p)
    print("+", " ".join(safe))
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=90)
    print(p.stdout[-12000:] if p.stdout else "(no stdout)")
    if p.stderr:
        print(p.stderr[-1500:], file=sys.stderr)
    ok = "PATCH_DONE" in (p.stdout or "") and '{"ok":true' in (p.stdout or "")
    # also want public 200 ideally
    if "https_public code=200" in (p.stdout or ""):
        print("PUBLIC_OK")
        return 0
    if ok:
        print("PARTIAL_OK")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
