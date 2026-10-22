#!/usr/bin/env python3
"""Deploy Carrito GT API to Chat Center server via plink/pscp (Windows)."""

from __future__ import annotations

import json
import secrets
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
API = ROOT / "api"
SECRETS = API / ".deploy_secrets_full.json"


def _redact(cmd: list[str]) -> str:
    out: list[str] = []
    skip = False
    for i, part in enumerate(cmd):
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


def run(cmd: list[str], input_text: str | None = None) -> subprocess.CompletedProcess[str]:
    print("+", _redact(cmd))
    return subprocess.run(
        cmd,
        input=input_text,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main() -> int:
    if not SECRETS.exists():
        print("Missing api/.deploy_secrets_full.json", file=sys.stderr)
        return 1
    sec = json.loads(SECRETS.read_text(encoding="utf-8"))
    host = sec["host"]
    user = sec["ssh_user"]
    pw = sec["ssh_pass"]
    db_user = sec["db_user"]
    db_pass = sec["db_pass"]
    db_name = sec["db_name"]
    target = f"{user}@{host}"
    remote_dir = "/opt/carrito-gt-api"
    api_token = secrets.token_urlsafe(48)

    # 1) Connectivity + accept host key once
    p = run(
        ["plink", "-ssh", target, "-pw", pw, "echo CONNECTED && uname -a && python3 --version"],
        input_text="y\n",
    )
    print(p.stdout)
    if p.returncode != 0:
        print(p.stderr, file=sys.stderr)
        print("SSH failed", file=sys.stderr)
        return p.returncode

    # 2) Packages
    remote_prep = (
        "export DEBIAN_FRONTEND=noninteractive; "
        "apt-get update -qq; "
        "apt-get install -y -qq python3-pip python3-venv libpq-dev postgresql-client >/tmp/car_apt.log 2>&1; "
        f"mkdir -p {remote_dir}; "
        "echo PREP_OK"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, remote_prep])
    print(p.stdout[-1500:])
    if "PREP_OK" not in (p.stdout or ""):
        print(p.stderr[-2000:], file=sys.stderr)
        print("apt/prep failed", file=sys.stderr)
        return 1

    # 3) Upload api tree (exclude venv/env/secrets)
    # pscp -r uploads contents; upload to temp then rsync-like via tar over plink is cleaner
    with tempfile.TemporaryDirectory() as td:
        bundle = Path(td) / "api_bundle.tgz"
        # create tar locally with Python
        import tarfile

        with tarfile.open(bundle, "w:gz") as tar:
            for path in API.rglob("*"):
                if not path.is_file():
                    continue
                rel = path.relative_to(API)
                parts = set(rel.parts)
                if ".venv" in parts or "__pycache__" in parts:
                    continue
                name = path.name
                if name.startswith(".deploy_secrets") or name == ".env":
                    continue
                if path.suffix == ".pyc":
                    continue
                tar.add(path, arcname=str(rel).replace("\\", "/"))

        p = run(["pscp", "-batch", "-pw", pw, str(bundle), f"{target}:/tmp/carrito-gt-api.tgz"])
        if p.returncode != 0:
            print(p.stderr, file=sys.stderr)
            print("pscp failed", file=sys.stderr)
            return p.returncode

    extract = (
        f"mkdir -p {remote_dir} && "
        f"tar -xzf /tmp/carrito-gt-api.tgz -C {remote_dir} && "
        f"rm -f /tmp/carrito-gt-api.tgz && "
        f"ls -la {remote_dir} | head && echo EXTRACT_OK"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, extract])
    print(p.stdout[-1500:])
    if "EXTRACT_OK" not in (p.stdout or ""):
        print(p.stderr[-2000:], file=sys.stderr)
        return 1

    # 4) Write .env on server (DB on localhost from server POV)
    env_body = "\n".join(
        [
            "CAR_DB_HOST=127.0.0.1",
            "CAR_DB_PORT=5432",
            f"CAR_DB_NAME={db_name}",
            f"CAR_DB_USER={db_user}",
            f"CAR_DB_PASSWORD={db_pass}",
            f"CAR_API_TOKENS={api_token}",
            "CAR_REQUIRE_HTTPS=false",
            "CAR_IP_ALLOWLIST=",
            "CAR_RATE_LIMIT_PER_MINUTE=120",
            "CAR_API_HOST=127.0.0.1",
            "CAR_API_PORT=8787",
            "CAR_API_TITLE=Carrito GT API",
            "CAR_API_VERSION=0.1.0",
            "CAR_CORS_ORIGINS=",
            "",
        ]
    )
    # upload env via base64 to avoid shell quoting issues
    import base64

    b64 = base64.b64encode(env_body.encode("utf-8")).decode("ascii")
    write_env = (
        f"echo {b64} | base64 -d > {remote_dir}/.env && "
        f"chmod 600 {remote_dir}/.env && echo ENV_OK"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, write_env])
    print(p.stdout)
    if "ENV_OK" not in (p.stdout or ""):
        print(p.stderr[-2000:], file=sys.stderr)
        return 1

    # Save token locally for the user (gitignored)
    token_file = API / ".deployed_api_token.txt"
    token_file.write_text(
        f"# Generated during remote deploy — keep private\n"
        f"# Test: curl -H \"Authorization: Bearer …\" http://127.0.0.1:8787/v1/me  (on server)\n"
        f"CAR_API_TOKEN={api_token}\n",
        encoding="utf-8",
    )

    # 5) venv + pip
    venv_cmd = (
        f"cd {remote_dir} && "
        "python3 -m venv .venv && "
        ". .venv/bin/activate && "
        "pip install -q --upgrade pip && "
        "pip install -q -r requirements.txt && "
        "echo VENV_OK"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, venv_cmd])
    print(p.stdout[-1500:])
    if "VENV_OK" not in (p.stdout or ""):
        print(p.stderr[-3000:], file=sys.stderr)
        return 1

    # 6) SQL migration — try as DB user; fallback postgres
    sql_cmd = (
        f"cd {remote_dir} && "
        f"PGPASSWORD='{db_pass}' psql -h 127.0.0.1 -U {db_user} -d {db_name} "
        f"-v ON_ERROR_STOP=1 -f sql/001_car_tables.sql && echo SQL_OK"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, sql_cmd])
    print(p.stdout[-2000:])
    if "SQL_OK" not in (p.stdout or ""):
        print("DB user migrate failed, trying sudo -u postgres…", file=sys.stderr)
        print(p.stderr[-2000:], file=sys.stderr)
        sql_cmd2 = (
            f"sudo -u postgres psql -d {db_name} -v ON_ERROR_STOP=1 "
            f"-f {remote_dir}/sql/001_car_tables.sql && echo SQL_OK"
        )
        p = run(["plink", "-batch", "-ssh", target, "-pw", pw, sql_cmd2])
        print(p.stdout[-2000:])
        if "SQL_OK" not in (p.stdout or ""):
            print(p.stderr[-2000:], file=sys.stderr)
            print("SQL migration failed", file=sys.stderr)
            return 1

    # 7) systemd unit
    unit = f"""[Unit]
Description=Carrito GT API
After=network.target postgresql.service

[Service]
WorkingDirectory={remote_dir}
EnvironmentFile={remote_dir}/.env
ExecStart={remote_dir}/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8787
Restart=on-failure
User=root

[Install]
WantedBy=multi-user.target
"""
    unit_b64 = base64.b64encode(unit.encode("utf-8")).decode("ascii")
    systemd = (
        f"echo {unit_b64} | base64 -d > /etc/systemd/system/carrito-gt-api.service && "
        "systemctl daemon-reload && "
        "systemctl enable carrito-gt-api && "
        "systemctl restart carrito-gt-api && "
        "sleep 2 && "
        "systemctl is-active carrito-gt-api && "
        "curl -s http://127.0.0.1:8787/health && echo && "
        f"curl -s -H 'Authorization: Bearer {api_token}' http://127.0.0.1:8787/v1/me && echo && "
        "echo SERVICE_OK"
    )
    p = run(["plink", "-batch", "-ssh", target, "-pw", pw, systemd])
    print(p.stdout[-2000:])
    if "SERVICE_OK" not in (p.stdout or ""):
        print(p.stderr[-3000:], file=sys.stderr)
        # show journal
        j = run(
            [
                "plink",
                "-batch",
                "-ssh",
                target,
                "-pw",
                pw,
                "journalctl -u carrito-gt-api -n 40 --no-pager",
            ]
        )
        print(j.stdout[-3000:])
        print(j.stderr[-1000:], file=sys.stderr)
        return 1

    print("\n=== DEPLOY OK ===")
    print(f"Remote: {remote_dir}")
    print("Health: http://127.0.0.1:8787/health (on server)")
    print(f"Token saved locally (gitignored): {token_file}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
