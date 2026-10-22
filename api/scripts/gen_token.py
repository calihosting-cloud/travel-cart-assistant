#!/usr/bin/env python3
"""Generate a strong API token for CAR_API_TOKENS (Python 3.10)."""
import secrets

print(secrets.token_urlsafe(48))
