#!/usr/bin/env python3
"""Set CAR_ADMIN_USER on the Chat Center server and restart the API."""

from __future__ import annotations

import base64
import json
import subprocess
import sys
from pathlib import Path

API = Path(__file__).resolve().parents[1]
SECRETS = API / ".deploy_secrets_full.json"
ADMIN_OUT = API / ".deployed_admin.txt"
NEW_USER = "adminapigt"


def run(cmd: list[str]) -> subprocess.CompletedProcess[str]:
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
    return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60)


def main() -> int:
    sec = json.loads(SECRETS.read_text(encoding="utf-8"))
    target = f"{sec['ssh_user']}@{sec['host']}"
    pw = sec["ssh_pass"]
    remote_py = f"""
from pathlib import Path
import re
env = Path("/opt/carrito-gt-api/.env")
text = env.read_text(encoding="utf-8")
line = "CAR_ADMIN_USER={NEW_USER}"
if re.search(r"^CAR_ADMIN_USER=", text, re.M):
    text = re.sub(r"^CAR_ADMIN_USER=.*$", line, text, count=1, flags=re.M)
else:
    text = text.rstrip() + "\\n" + line + "\\n"
env.write_text(text, encoding="utf-8")
print("USER_SET")
"""
    b64 = base64.b64encode(remote_py.encode()).decode("ascii")
    remote = (
        f"echo {b64} | base64 -d > /tmp/set_admin_user.py && python3 /tmp/set_admin_user.py && "
        "systemctl restart carrito-gt-api && sleep 1 && systemctl is-active carrito-gt-api && "
        "grep '^CAR_ADMIN_USER=' /opt/carrito-gt-api/.env && echo DONE"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, remote])
    print(p.stdout or "")
    if p.stderr:
        print(p.stderr[-1000:], file=sys.stderr)
    if "DONE" not in (p.stdout or "") or f"CAR_ADMIN_USER={NEW_USER}" not in (p.stdout or ""):
        return 1

    if ADMIN_OUT.exists():
        lines = []
        for line in ADMIN_OUT.read_text(encoding="utf-8").splitlines():
            if line.startswith("CAR_ADMIN_USER="):
                lines.append(f"CAR_ADMIN_USER={NEW_USER}")
            else:
                lines.append(line)
        ADMIN_OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print("Updated", ADMIN_OUT)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
