"""Clerk JWT verification."""

import os
from pathlib import Path

import httpx
from dotenv import load_dotenv
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

load_dotenv(Path(__file__).parent.parent.parent / ".env")

# Derive JWKS URL from publishable key if env var is not set.
# Publishable key format: pk_test_<base64(domain)>$
_pk = os.environ.get("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "")
_domain_b64 = _pk.split("_")[-1].rstrip("$") if "_" in _pk else ""
try:
    import base64
    _domain = base64.b64decode(_domain_b64 + "==").decode().rstrip("\x00")
except Exception:
    _domain = ""

JWKS_URL = (
    os.environ.get("CLERK_JWKS_URL")
    or (f"https://{_domain}/.well-known/jwks.json" if _domain else "")
)

_jwks_cache: dict | None = None


def _fetch_jwks() -> dict:
    global _jwks_cache
    if not JWKS_URL:
        raise HTTPException(status_code=503, detail="Auth not configured (missing CLERK_JWKS_URL)")
    resp = httpx.get(JWKS_URL, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    return _jwks_cache


def _get_jwks() -> dict:
    return _jwks_cache if _jwks_cache is not None else _fetch_jwks()


def _find_key(jwks: dict, kid: str) -> dict | None:
    return next((k for k in jwks.get("keys", []) if k.get("kid") == kid), None)


def verify_token(token: str) -> str:
    """Verify a Clerk JWT and return the Clerk user_id (sub claim)."""
    try:
        jwks = _get_jwks()
        headers = jwt.get_unverified_headers(token)
        kid = headers.get("kid", "")
        key = _find_key(jwks, kid)
        if key is None:
            # Keys may have rotated — refresh once
            key = _find_key(_fetch_jwks(), kid)
        if key is None:
            raise HTTPException(status_code=401, detail="Unknown signing key")
        payload = jwt.decode(token, key, algorithms=["RS256"], options={"verify_aud": False})
        return payload["sub"]
    except HTTPException:
        raise
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Auth error: {exc}")


bearer = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str:
    """FastAPI dependency — returns Clerk user_id or raises 401."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return verify_token(credentials.credentials)


def get_optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)) -> str | None:
    """FastAPI dependency — returns Clerk user_id or None (never raises)."""
    if not credentials:
        return None
    try:
        return verify_token(credentials.credentials)
    except Exception:
        return None
