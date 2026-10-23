"""
Carrito GT API — FastAPI (Python 3.10).

No modifica la extensión Chrome. Solo expone endpoints seguros sobre tablas car_*.
Docs interactivas: GET /docs  (Swagger) y GET /redoc
Admin tokens: GET /admin
"""

from __future__ import annotations

from pathlib import Path

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text
from sqlalchemy.orm import Session
from starlette.middleware.sessions import SessionMiddleware

from . import __version__
from .config import get_settings
from .db import get_db
from .routers import admin, agencias, asesores, contactos, cotizaciones, oportunidades
from .schemas import HealthOut
from .security import require_api_token

settings = get_settings()

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.car_rate_limit_per_minute}/minute"],
)

app = FastAPI(
    title=settings.car_api_title,
    version=settings.car_api_version,
    description=(
        "API del Carrito GT para Chat Center. "
        "Autenticación: header `Authorization: Bearer <token>` o `X-API-Token`. "
        "Tablas con prefijo `car_`. Panel admin: `/admin`. "
        "Ver `api/README.md` y `api/CHANGELOG.md`."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Session cookie for /admin (must be before routes that use request.session)
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret(),
    session_cookie="car_admin_session",
    max_age=max(1, settings.car_admin_session_hours) * 3600,
    same_site="lax",
    https_only=bool(settings.car_require_https),
)

origins = settings.cors_origin_list()
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "X-API-Token", "Content-Type"],
    )

app.include_router(admin.router)
app.include_router(contactos.router)
app.include_router(asesores.router)
app.include_router(agencias.router)
app.include_router(cotizaciones.router)
app.include_router(oportunidades.router)


@app.get("/health", response_model=HealthOut, tags=["system"])
def health(db: Session = Depends(get_db)) -> HealthOut:
    """Público: liveness + versión de schema (sin datos)."""
    schema_version = None
    try:
        row = db.execute(
            text("SELECT value FROM car_schema_meta WHERE key = 'version'")
        ).fetchone()
        if row:
            schema_version = row[0]
    except Exception:
        schema_version = None
    return HealthOut(ok=True, version=__version__, schema_version=schema_version)


@app.get("/v1/me", tags=["system"])
@limiter.limit(f"{settings.car_rate_limit_per_minute}/minute")
def me(request: Request, _token: str = Depends(require_api_token)) -> JSONResponse:
    """Verifica que el token es válido."""
    return JSONResponse({"ok": True, "auth": "token"})


def run() -> None:
    import uvicorn

    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        from dotenv import load_dotenv

        load_dotenv(env_path)

    uvicorn.run(
        "app.main:app",
        host=settings.car_api_host,
        port=settings.car_api_port,
        reload=False,
    )


if __name__ == "__main__":
    run()
