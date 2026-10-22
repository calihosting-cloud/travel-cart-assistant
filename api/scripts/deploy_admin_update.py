#!/usr/bin/env python3
"""Upload API code + enable /admin credentials on Chat Center server."""

from __future__ import annotations

import base64
import json
import secrets
import subprocess
import sys
import tarfile
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "api"
SECRETS = API / ".deploy_secrets_full.json"
ADMIN_OUT = API / ".deployed_admin.txt"


def _redact(cmd: list[str]) -> str:
    out: list[str] = []
    skip = False
    for part in cmd:
        if skip:
            out.append("***")
            skip = False
            continue
        if part in {"-pw", "-password"}:
            out.append(part)
            skip = True
            continue
        out.append(part)
    return " ".join(out)


def run(cmd: list[str], timeout: int = 180) -> subprocess.CompletedProcess[str]:
    print("+", _redact(cmd))
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def main() -> int:
    if not SECRETS.exists():
        print("Missing api/.deploy_secrets_full.json", file=sys.stderr)
        return 1
    sec = json.loads(SECRETS.read_text(encoding="utf-8"))
    target = f"{sec['ssh_user']}@{sec['host']}"
    pw = sec["ssh_pass"]
    remote_dir = "/opt/carrito-gt-api"

    admin_user = "adminapigt"
    admin_pass = secrets.token_urlsafe(18)
    session_secret = secrets.token_urlsafe(48)

    with tempfile.TemporaryDirectory() as td:
        bundle = Path(td) / "api_update.tgz"
        with tarfile.open(bundle, "w:gz") as tar:
            for path in API.rglob("*"):
                if not path.is_file():
                    continue
                rel = path.relative_to(API)
                parts = set(rel.parts)
                if parts & {".venv", "__pycache__", ".git"}:
                    continue
                name = path.name
                if name.startswith(".deploy") or name in {".env", ".env.local"}:
                    continue
                if name.endswith((".pyc", ".pyo")):
                    continue
                tar.add(path, arcname=str(rel).replace("\\", "/"))

        p = run(
            ["pscp", "-batch", "-pw", pw, str(bundle), f"{target}:/tmp/carrito_api_update.tgz"],
            timeout=120,
        )
        if p.returncode != 0:
            print(p.stderr[-2000:], file=sys.stderr)
            return 1

    remote_py = f"""
from pathlib import Path
import re
env = Path("{remote_dir}/.env")
text = env.read_text(encoding="utf-8") if env.exists() else ""

def upsert(key, value):
    global text
    line = f"{{key}}={{value}}"
    if re.search(rf"^{{re.escape(key)}}=", text, re.M):
        text = re.sub(rf"^{{re.escape(key)}}=.*$", line, text, count=1, flags=re.M)
    else:
        text = text.rstrip() + "\\n" + line + "\\n"

upsert("CAR_ADMIN_USER", {admin_user!r})
m = re.search(r"^CAR_ADMIN_PASSWORD=(.*)$", text, re.M)
if not m or not (m.group(1) or "").strip():
    upsert("CAR_ADMIN_PASSWORD", {admin_pass!r})
    print("ADMIN_PASSWORD_SET")
else:
    print("ADMIN_PASSWORD_KEPT")
m2 = re.search(r"^CAR_ADMIN_SESSION_SECRET=(.*)$", text, re.M)
if not m2 or not (m2.group(1) or "").strip():
    upsert("CAR_ADMIN_SESSION_SECRET", {session_secret!r})
upsert("CAR_API_VERSION", "0.2.0")
upsert("CAR_ROOT_PATH", "/car-api")
if re.search(r"^CAR_API_HOST=127\\.0\\.0\\.1\\s*$", text, re.M):
    upsert("CAR_API_HOST", "0.0.0.0")
env.write_text(text, encoding="utf-8")
print("ENV_OK")
"""
    b64 = base64.b64encode(remote_py.encode()).decode("ascii")
    remote_sh = (
        f"set -e\n"
        f"cd {remote_dir}\n"
        f"tar xzf /tmp/carrito_api_update.tgz\n"
        f"./.venv/bin/pip install -q -r requirements.txt\n"
        f"echo {b64} | base64 -d > /tmp/patch_admin_env.py\n"
        f"python3 /tmp/patch_admin_env.py\n"
        f"systemctl restart carrito-gt-api\n"
        f"sleep 2\n"
        f"systemctl is-active carrito-gt-api\n"
        f"curl -sS http://127.0.0.1:8787/health; echo\n"
        f"curl -sS -o /tmp/admin.html -w '%{{http_code}}' http://127.0.0.1:8787/admin/login; echo\n"
        f"grep -o 'Carrito API' /tmp/admin.html | head -1\n"
        f"echo DEPLOY_ADMIN_OK\n"
    )
    b64sh = base64.b64encode(remote_sh.encode()).decode("ascii")
    p = run(
        [
            "plink",
            "-batch",
            "-ssh",
            target,
            "-pw",
            pw,
            f"echo {b64sh} | base64 -d > /tmp/deploy_admin.sh && bash /tmp/deploy_admin.sh",
        ],
        timeout=180,
    )
    print(p.stdout[-4000:] if p.stdout else "(no stdout)")
    if p.stderr:
        print(p.stderr[-1500:], file=sys.stderr)
    if "DEPLOY_ADMIN_OK" not in (p.stdout or ""):
        return 1

    if "ADMIN_PASSWORD_SET" in (p.stdout or ""):
        ADMIN_OUT.write_text(
            "# Local only — gitignored\n"
            "# URL: https://chatcrm.grupostravel.com/car-api/admin\n"
            f"CAR_ADMIN_USER={admin_user}\n"
            f"CAR_ADMIN_PASSWORD={admin_pass}\n",
            encoding="utf-8",
        )
        print("Wrote", ADMIN_OUT)
    else:
        print("Admin password already present on server; not overwritten.")
        if not ADMIN_OUT.exists():
            ADMIN_OUT.write_text(
                "# Password already on server .env (not rotated).\n"
                "# URL: https://chatcrm.grupostravel.com/car-api/admin\n"
                f"CAR_ADMIN_USER={admin_user}\n"
                "# CAR_ADMIN_PASSWORD=<see server /opt/carrito-gt-api/.env>\n",
                encoding="utf-8",
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
