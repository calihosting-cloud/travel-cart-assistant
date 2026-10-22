"""HTML admin panel for API tokens (session cookie, not Bearer)."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from ..config import Settings, get_settings
from ..db import get_db
from ..models import CarApiToken
from ..security import (
    clear_admin_session,
    generate_api_token,
    hash_api_token,
    is_admin_logged_in,
    admin_session_user,
    set_admin_session,
    verify_admin_password,
)

_TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Jinja2Templates(directory=str(_TEMPLATES_DIR))

router = APIRouter(prefix="/admin", tags=["admin"], include_in_schema=False)


def _redirect(settings: Settings, path: str, status_code: int = 303) -> RedirectResponse:
    return RedirectResponse(url=settings.public_path(path), status_code=status_code)


def _tpl(request: Request, name: str, settings: Settings, **extra) -> HTMLResponse:
    return templates.TemplateResponse(
        name,
        {
            "request": request,
            "rp": settings.public_path,
            **extra,
        },
    )


@router.get("", response_class=HTMLResponse)
@router.get("/", response_class=HTMLResponse)
def admin_home(
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> HTMLResponse:
    if not is_admin_logged_in(request):
        return _redirect(settings, "/admin/login")
    tokens = (
        db.query(CarApiToken)
        .order_by(CarApiToken.created_at.desc())
        .limit(200)
        .all()
    )
    flash = request.session.pop("flash", None)
    flash_error = request.session.pop("flash_error", False)
    new_token = request.session.pop("new_token", None)
    return _tpl(
        request,
        "admin/dashboard.html",
        settings,
        admin_user=admin_session_user(request),
        tokens=tokens,
        flash=flash,
        flash_error=flash_error,
        new_token=new_token,
    )


@router.get("/login", response_class=HTMLResponse)
def login_page(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> HTMLResponse:
    if is_admin_logged_in(request):
        return _redirect(settings, "/admin/")
    return _tpl(
        request,
        "admin/login.html",
        settings,
        admin_enabled=settings.admin_enabled(),
        error=request.session.pop("login_error", None),
    )


@router.post("/login")
def login_submit(
    request: Request,
    username: str = Form(...),
    password: str = Form(...),
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    if not settings.admin_enabled():
        request.session["login_error"] = "Admin no configurado en el servidor."
        return _redirect(settings, "/admin/login")
    if not verify_admin_password(username, password, settings):
        request.session["login_error"] = "Usuario o contraseña incorrectos."
        return _redirect(settings, "/admin/login")
    set_admin_session(request, username.strip())
    return _redirect(settings, "/admin/")


@router.post("/logout")
def logout(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> RedirectResponse:
    clear_admin_session(request)
    return _redirect(settings, "/admin/login")


@router.post("/tokens")
def create_token(
    request: Request,
    name: str = Form(...),
    scopes: str = Form("read,write"),
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not is_admin_logged_in(request):
        return _redirect(settings, "/admin/login")
    label = (name or "").strip()
    if not label:
        request.session["flash"] = "El nombre es obligatorio."
        request.session["flash_error"] = True
        return _redirect(settings, "/admin/")
    scope_list = [s.strip() for s in scopes.split(",") if s.strip()] or ["read", "write"]
    plaintext = generate_api_token()
    row = CarApiToken(
        name=label[:200],
        token_hash=hash_api_token(plaintext),
        scopes=scope_list,
        activo=True,
    )
    db.add(row)
    db.commit()
    request.session["new_token"] = plaintext
    request.session["flash"] = f"Token «{label}» creado."
    return _redirect(settings, "/admin/")


@router.post("/tokens/{token_id}/revoke")
def revoke_token(
    token_id: int,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not is_admin_logged_in(request):
        return _redirect(settings, "/admin/login")
    row = db.get(CarApiToken, token_id)
    if not row:
        request.session["flash"] = "Token no encontrado."
        request.session["flash_error"] = True
        return _redirect(settings, "/admin/")
    row.activo = False
    db.commit()
    request.session["flash"] = f"Token «{row.name}» revocado."
    return _redirect(settings, "/admin/")


@router.post("/tokens/{token_id}/activate")
def activate_token(
    token_id: int,
    request: Request,
    settings: Settings = Depends(get_settings),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    if not is_admin_logged_in(request):
        return _redirect(settings, "/admin/login")
    row = db.get(CarApiToken, token_id)
    if not row:
        request.session["flash"] = "Token no encontrado."
        request.session["flash_error"] = True
        return _redirect(settings, "/admin/")
    row.activo = True
    db.commit()
    request.session["flash"] = f"Token «{row.name}» reactivado."
    return _redirect(settings, "/admin/")
