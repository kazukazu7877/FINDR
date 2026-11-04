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
    """Retrieve a configuration secret from Streamlit session state, Streamlit secrets, or local .env."""
    # 1. Check Streamlit session_state (allows dynamic runtime updates via UI)
    try:
        import streamlit as st
        if hasattr(st, "session_state"):
            for candidate in (key, key.lower(), key.upper(), f"secret_{key.lower()}"):
                if candidate in st.session_state and st.session_state[candidate]:
                    val = str(st.session_state[candidate]).strip()
                    if val:
                        return val
    except Exception:
        pass

    # 2. Check Streamlit Cloud secrets (st.secrets)
    try:
        import streamlit as st
        if hasattr(st, "secrets"):
            # Direct match
            if key in st.secrets:
                val = str(st.secrets[key]).strip()
                if val:
                    return val
            # Case-insensitive or nested match
            for k in st.secrets:
                if k.lower() == key.lower():
                    val = str(st.secrets[k]).strip()
                    if val:
                        return val
                # Check nested dicts/sections
                sec = st.secrets[k]
                if isinstance(sec, dict):
                    for subk in sec:
                        if subk.lower() == key.lower():
                            val = str(sec[subk]).strip()
                            if val:
                                return val
    except Exception:
        pass

    # 3. Check local environment (.env / os.environ)
    for k in (key, key.upper(), key.lower()):
        val = os.getenv(k)
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


def get_gemini_api_key() -> str | None:
    """Retrieve active Gemini API key from session state, secrets, or environment."""
    key = get_secret("GEMINI_API_KEY")
    if key and key.strip() and key != "your_api_key_here":
        return key.strip()
    return None


# Core AI Secret
GEMINI_API_KEY: str | None = get_gemini_api_key()

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
_raw_access_code = get_secret("EXHIBITION_ACCESS_CODE")
if _raw_access_code:
    EXHIBITION_ACCESS_CODE: str = _raw_access_code.strip()
else:
    EXHIBITION_ACCESS_CODE: str = "4mtk_3UbP#Sx9qW"


def is_postgres() -> bool:
    """Return True if a PostgreSQL connection string is configured."""
    return bool(DATABASE_URL)


def is_supabase_storage() -> bool:
    """Return True if Supabase Storage credentials are fully configured."""
    return bool(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY)


def validate_environment_config() -> None:
    """Validate environment configuration.

    Resilient design: In development or production, logs status guidance if external services
    are omitted without crashing the Streamlit app. Transparently falls back to local SQLite
    and local storage.
    """
    import logging
    _log = logging.getLogger("findr.config")

    if is_production():
        if not DATABASE_URL:
            _log.info("Production note: 'DATABASE_URL' not configured. Running with local SQLite database.")
        if not (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY):
            _log.info("Production note: Supabase storage not configured. Running with local image storage.")


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
GENERATION_MODEL = get_secret("GENERATION_MODEL", "gemini-3.5-flash")
EMBEDDING_MODEL = get_secret("EMBEDDING_MODEL", "gemini-embedding-2")
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
# Validation Helper & Dynamic Attribute Resolution
# ---------------------------------------------------------------------------

def validate_api_key() -> bool:
    """Return True if the Gemini API key is present and configured.
    Checks dynamically against session state, secrets, and environment."""
    key = get_gemini_api_key()
    return bool(key and key != "your_api_key_here" and len(key) > 5)


def __getattr__(name: str):
    """Dynamically resolve GEMINI_API_KEY when accessed as an attribute on config."""
    if name == "GEMINI_API_KEY":
        return get_gemini_api_key()
    raise AttributeError(f"module '{__name__}' has no attribute '{name}'")
