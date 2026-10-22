"""Settings from environment (api/.env). Python 3.10 compatible."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_API_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _API_DIR / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE) if _ENV_FILE.exists() else ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    car_db_host: str = "127.0.0.1"
    car_db_port: int = 5432
    car_db_name: str = "chat_center_gt"
    car_db_user: str = "crm_gt_app"
    car_db_password: str = ""
    car_database_url: Optional[str] = None

    # Comma-separated bearer tokens (plaintext in env; compared with hmac)
    car_api_tokens: str = ""
    car_require_https: bool = True
    car_ip_allowlist: str = ""
    car_rate_limit_per_minute: int = 120

    car_api_host: str = "127.0.0.1"
    car_api_port: int = 8787
    car_api_title: str = "Carrito GT API"
    car_api_version: str = "0.1.0"
    car_cors_origins: str = ""

    @field_validator("car_require_https", mode="before")
    @classmethod
    def _boolish(cls, v):  # type: ignore[no-untyped-def]
        if isinstance(v, bool):
            return v
        if v is None:
            return True
        return str(v).strip().lower() in {"1", "true", "yes", "on"}

    def database_url(self) -> str:
        if self.car_database_url:
            return self.car_database_url
        user = self.car_db_user
        pwd = self.car_db_password
        host = self.car_db_host
        port = self.car_db_port
        name = self.car_db_name
        return f"postgresql+psycopg2://{user}:{pwd}@{host}:{port}/{name}"

    def api_token_list(self) -> List[str]:
        return [t.strip() for t in self.car_api_tokens.split(",") if t.strip()]

    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.car_cors_origins.split(",") if o.strip()]

    def ip_allowlist(self) -> List[str]:
        return [i.strip() for i in self.car_ip_allowlist.split(",") if i.strip()]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
