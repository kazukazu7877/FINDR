"""
FINDR Configuration
-------------------
Loads environment variables, validates the Gemini API key,
and defines application-wide constants.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Environment & Secret Management (supports Streamlit Cloud & local .env)
# ---------------------------------------------------------------------------
load_dotenv()


def get_secret(key: str, default: str | None = None) -> str | None:
    """Retrieve a configuration secret from Streamlit Cloud secrets or local .env."""
    # 1. Check Streamlit Cloud secrets (st.secrets)
    try:
        import streamlit as st
        if hasattr(st, "secrets") and key in st.secrets:
            val = str(st.secrets[key]).strip()
            if val:
                return val
    except Exception:
        pass

    # 2. Check local environment (.env)
    val = os.getenv(key)
    if val is not None and val.strip() != "":
        return val.strip()

    return default


class ConfigurationError(RuntimeError):
    """Raised when application configuration is invalid or missing required secrets."""
    pass


# Environment Mode (explicitly distinguishes development vs production)
FINDR_ENV: str = (
    get_secret("FINDR_ENV")
    or get_secret("ENVIRONMENT")
    or get_secret("ENV")
    or "development"
).strip().lower()


def is_production() -> bool:
    """Return True if running in production mode."""
    return FINDR_ENV in ("production", "prod")


def is_development() -> bool:
    """Return True if running in development mode."""
    return not is_production()


# Core AI Secret
GEMINI_API_KEY: str | None = get_secret("GEMINI_API_KEY")

# Supabase PostgreSQL Database (defaults to local SQLite findr.db when None in development)
DATABASE_URL: str | None = get_secret("DATABASE_URL") or get_secret("SUPABASE_DB_URL")

# Supabase Storage & API Credentials
# Backend server operations (private bucket access) require the SERVICE ROLE key.
# The ANON key is the client/browser key and should NOT be used for backend admin tasks.
SUPABASE_URL: str | None = get_secret("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY: str | None = (
    get_secret("SUPABASE_SERVICE_ROLE_KEY")
    or get_secret("SUPABASE_KEY")
)
SUPABASE_ANON_KEY: str | None = get_secret("SUPABASE_ANON_KEY")
SUPABASE_STORAGE_BUCKET: str = get_secret("SUPABASE_STORAGE_BUCKET", "findr-images")

# Exhibition Access Control (for public summit demo: protects submissions, confirmations & contact info)
# In production, this MUST be explicitly configured and non-default.
# In development, falls back to a development-only passcode if unspecified.
_raw_access_code = get_secret("EXHIBITION_ACCESS_CODE")
if _raw_access_code:
    EXHIBITION_ACCESS_CODE: str | None = _raw_access_code.strip()
elif is_development():
    EXHIBITION_ACCESS_CODE: str | None = "findr-dev-code"
else:
    EXHIBITION_ACCESS_CODE: str | None = None


def is_postgres() -> bool:
    """Return True if a PostgreSQL connection string is configured."""
    return bool(DATABASE_URL)


def is_supabase_storage() -> bool:
    """Return True if Supabase Storage credentials are fully configured."""
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def validate_environment_config() -> None:
    """Validate environment configuration.

    In development mode: Allows SQLite and local storage if cloud secrets are omitted.
    In production mode: Strictly requires DATABASE_URL (PostgreSQL), Supabase Storage credentials,
    and a strong, non-default EXHIBITION_ACCESS_CODE. Halts with ConfigurationError if any is missing.
    """
    if is_production():
        # 1. Database URL check
        if not DATABASE_URL:
            raise ConfigurationError(
                "Production Configuration Error: 'DATABASE_URL' is required when FINDR_ENV='production'. "
                "Silent fallback to local SQLite is prohibited in production. "
                "Configure DATABASE_URL to your Supabase PostgreSQL Shared Session Pooler (port 5432)."
            )
        if not (DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")):
            raise ConfigurationError(
                "Production Configuration Error: 'DATABASE_URL' must be a valid PostgreSQL connection URI "
                "(e.g. postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require)."
            )

        # 2. Supabase Storage check
        if not SUPABASE_URL:
            raise ConfigurationError(
                "Production Configuration Error: 'SUPABASE_URL' is required in production for private storage. "
                "Silent fallback to local disk storage is prohibited in production."
            )
        if not SUPABASE_SERVICE_ROLE_KEY:
            raise ConfigurationError(
                "Production Configuration Error: 'SUPABASE_SERVICE_ROLE_KEY' is required in production to "
                "authenticate backend operations against the private 'findr-images' bucket."
            )

        # 3. Exhibition Access Code check
        if not EXHIBITION_ACCESS_CODE:
            raise ConfigurationError(
                "Production Configuration Error: 'EXHIBITION_ACCESS_CODE' is missing. "
                "Production mode strictly requires a strong, privately configured access code in secrets."
            )
        insecure_codes = {"FINDR2026", "PASSWORD", "123456", "ADMIN", "STAFF", "TEST", "FINDR"}
        if EXHIBITION_ACCESS_CODE.upper() in insecure_codes or len(EXHIBITION_ACCESS_CODE) < 8:
            raise ConfigurationError(
                "Production Configuration Error: 'EXHIBITION_ACCESS_CODE' is insecure or using a disallowed default. "
                "Please configure a strong, private passphrase (minimum 8 characters) in secrets."
            )


# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
DB_PATH = BASE_DIR / "findr.db"

# ---------------------------------------------------------------------------
# Gemini Models
# ---------------------------------------------------------------------------
GENERATION_MODEL = "gemini-3.8-flash"
EMBEDDING_MODEL = "gemini-embedding-2"
EMBEDDING_DIMENSIONS = 768  # reduced from 3072 for storage efficiency

# ---------------------------------------------------------------------------
# Matching Weights (provisional — tuned for demo)
# ---------------------------------------------------------------------------
WEIGHT_EMBEDDING = 0.65   # multimodal cosine similarity
WEIGHT_ATTRIBUTE = 0.25   # structured attribute comparison
WEIGHT_LOCATION  = 0.10   # location context bonus
MATCH_THRESHOLD  = 0.30   # minimum final score to surface a match
MAX_MATCHES      = 10     # maximum matches returned per query

# ---------------------------------------------------------------------------
# Item Categories
# ---------------------------------------------------------------------------
CATEGORIES: list[str] = [
    "Electronics",
    "Bags & Wallets",
    "Clothing",
    "Accessories",
    "Books & Stationery",
    "ID & Cards",
    "Keys",
    "Water Bottles",
    "Other",
]

# ---------------------------------------------------------------------------
# Image Constraints
# ---------------------------------------------------------------------------
MAX_IMAGE_SIZE_MB = 5
MAX_IMAGE_DIMENSION = 1024  # resize longest edge to this before API calls
SUPPORTED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}

# ---------------------------------------------------------------------------
# SDK Retry Configuration
# ---------------------------------------------------------------------------
RETRY_ATTEMPTS = 3         # Initial attempt + up to 2 retries (bounded, avoids excessive delay)
RETRY_INITIAL_DELAY = 2.0  # Initial delay in seconds
RETRY_MAX_DELAY = 8.0      # Maximum delay cap in seconds
RETRY_EXP_BASE = 2.0       # Exponential backoff base
RETRY_JITTER = 1.0         # Jitter factor for randomized intervals
RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504]  # Transient codes (excludes 400, 401, 403)
HTTP_TIMEOUT_MS = 30000.0  # Request timeout in milliseconds (30.0 seconds)


def get_http_options():
    """Return configured types.HttpOptions with bounded exponential backoff retries.
    Uses google-genai's native HttpRetryOptions so no duplicate retry loops are added.
    """
    from google.genai import types

    return types.HttpOptions(
        timeout=HTTP_TIMEOUT_MS,
        retry_options=types.HttpRetryOptions(
            attempts=RETRY_ATTEMPTS,
            initial_delay=RETRY_INITIAL_DELAY,
            max_delay=RETRY_MAX_DELAY,
            exp_base=RETRY_EXP_BASE,
            jitter=RETRY_JITTER,
            http_status_codes=RETRY_STATUS_CODES,
        ),
    )


# ---------------------------------------------------------------------------
# Validation Helper
# ---------------------------------------------------------------------------

def validate_api_key() -> bool:
    """Return True if the Gemini API key is present. 
    UI layer is responsible for displaying errors — this just checks."""
    return bool(GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here")
