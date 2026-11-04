"""
FINDR Storage Layer
-------------------
Handles secure image storage using a PRIVATE Supabase Storage bucket when configured,
storing object paths in PostgreSQL and generating short-lived signed URLs on-demand for display.
Falls back transparently to local disk storage for local offline development.
"""

import logging
import time
import uuid
from pathlib import Path

import config

logger = logging.getLogger(__name__)

# In-memory cache for generated signed URLs:
# {
#     object_path: {
#         "url": str,
#         "cached_at": float,
#         "cache_expires_at": float,        # Cache TTL: expires BEFORE the Supabase token expires
#         "supabase_expires_at": float,     # Actual token expiration on Supabase server
#     }
# }
_SIGNED_URL_CACHE: dict[str, dict[str, any]] = {}


def clear_signed_url_cache() -> None:
    """Clear in-memory cache of signed URLs (used for testing and resets)."""
    _SIGNED_URL_CACHE.clear()


def get_cached_url_info(object_path: str) -> dict | None:
    """Inspect cache metadata for an object path (used for testing)."""
    return _SIGNED_URL_CACHE.get(object_path)


def get_storage_client():
    """Return an authenticated Supabase client using the backend SERVICE ROLE key."""
    if not config.is_supabase_storage():
        return None
    from supabase import create_client

    # Backend storage operations on private buckets require the service-role key
    key = config.SUPABASE_SERVICE_ROLE_KEY
    if not key:
        logger.error("SUPABASE_SERVICE_ROLE_KEY is missing. Cannot access private storage.")
        return None
    return create_client(config.SUPABASE_URL, key)


def save_image(
    file_bytes: bytes,
    original_filename: str = "item.jpg",
    content_type: str = "image/jpeg",
) -> str:
    """Save an image to private Supabase Storage in production; local disk in development.

    Returns:
        The persistent object path (e.g., 'reports/abc123.jpg' in private bucket)
        or a local absolute filepath string for offline local dev.
        NOTE: Never returns a raw permanent public URL.

    Raises:
        ConfigurationError: In production if Supabase credentials are missing.
        RuntimeError: In production if Supabase upload fails (no silent local fallback).
    """
    ext = Path(original_filename).suffix.lower()
    if ext not in (".jpg", ".jpeg", ".png", ".webp"):
        ext = ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # 1. Production Mode: Strictly require Supabase Storage; NEVER silently fall back
    if config.is_production():
        if not config.is_supabase_storage():
            raise config.ConfigurationError(
                "Production Configuration Error: Supabase Storage credentials "
                "(SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY) are required in production. "
                "Silent fallback to local disk storage is strictly prohibited."
            )

        client = get_storage_client()
        if client is None:
            raise config.ConfigurationError(
                "Production Configuration Error: Failed to obtain authenticated Supabase Storage client."
            )

        bucket = config.SUPABASE_STORAGE_BUCKET
        mime_map = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
        }
        mime = mime_map.get(ext, content_type)
        storage_path = f"reports/{unique_name}"

        try:
            client.storage.from_(bucket).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": mime, "upsert": "true"},
            )
            logger.info("Uploaded image to private Supabase bucket: %s", storage_path)
            return storage_path
        except Exception as e:
            raise RuntimeError(
                f"Production Supabase Storage upload failed for '{storage_path}': {e}. "
                "Silent fallback to local disk storage is prohibited in production."
            ) from e

    # 2. Development Mode: Use Supabase Storage if configured, otherwise local disk
    if config.is_supabase_storage():
        try:
            client = get_storage_client()
            if client is not None:
                bucket = config.SUPABASE_STORAGE_BUCKET
                mime_map = {
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".png": "image/png",
                    ".webp": "image/webp",
                }
                mime = mime_map.get(ext, content_type)
                storage_path = f"reports/{unique_name}"
                client.storage.from_(bucket).upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": mime, "upsert": "true"},
                )
                logger.info("Uploaded image to Supabase bucket in dev: %s", storage_path)
                return storage_path
        except Exception as e:
            logger.warning(
                "Supabase Storage upload failed in development (%s). Falling back to local storage.", e
            )

    # 3. Local Disk Storage (Development Only)
    local_path = config.UPLOADS_DIR / unique_name
    local_path.write_bytes(file_bytes)
    logger.info("Saved image to local storage: %s", local_path)
    return str(local_path)


def get_signed_url(object_path: str, expires_in: int = 3600) -> str | None:
    """Generate a temporary signed URL to safely access a private image.

    Features:
        - Cached URLs expire BEFORE their actual signed URL expiration on Supabase.
        - Automatically regenerates fresh signed URLs when the conservative cache window expires.
        - Prevents expired signed URLs from producing broken images in the UI.

    Args:
        object_path: Object path in the Supabase bucket (e.g., 'reports/abc123.jpg').
        expires_in: Expiration time in seconds (default: 3600 = 1 hour).

    Returns:
        A temporary signed HTTPS URL, or None if generation failed.
    """
    if not object_path or not config.is_supabase_storage():
        return None

    now = time.time()
    cached = _SIGNED_URL_CACHE.get(object_path)

    # Check cache first: Only serve if current time is strictly before the cache TTL
    # cache_expires_at is intentionally set 10-15% before actual Supabase token expiry
    if cached and now < cached.get("cache_expires_at", 0):
        return cached["url"]

    try:
        client = get_storage_client()
        if client is None:
            # Emergency fallback: If client creation momentarily fails, check if the old
            # token is still valid on Supabase's servers before discarding
            if cached and now < cached.get("supabase_expires_at", 0):
                return cached["url"]
            return None

        bucket = config.SUPABASE_STORAGE_BUCKET
        res = client.storage.from_(bucket).create_signed_url(object_path, expires_in=expires_in)
        signed_url = None
        if isinstance(res, dict):
            signed_url = res.get("signedURL") or res.get("signedUrl")
        elif hasattr(res, "signed_url"):
            signed_url = res.signed_url

        if signed_url:
            # Conservative cache TTL: cache expires 10 minutes (or 20%) before Supabase URL expires.
            # This ensures that any URL handed to the UI has guaranteed remaining validity.
            margin = max(30, min(600, int(expires_in * 0.2)))
            cache_ttl = max(10, expires_in - margin)

            _SIGNED_URL_CACHE[object_path] = {
                "url": signed_url,
                "cached_at": now,
                "cache_expires_at": now + cache_ttl,
                "supabase_expires_at": now + expires_in,
            }
            return signed_url
        else:
            # Generation returned no URL: evict stale entry if expired on Supabase
            if cached and now >= cached.get("supabase_expires_at", 0):
                _SIGNED_URL_CACHE.pop(object_path, None)
    except Exception as e:
        logger.error("Failed to generate signed URL for '%s': %s", object_path, e)
        # Evict expired entry so broken URL is not served
        if cached and now >= cached.get("supabase_expires_at", 0):
            _SIGNED_URL_CACHE.pop(object_path, None)

    return None


def resolve_image_source(image_ref: str | None, expires_in: int = 3600) -> str | None:
    """Resolve an image reference to a displayable source (signed URL or local file path).

    Args:
        image_ref: An object path ('reports/...'), an HTTP/HTTPS URL, or a local file path.
        expires_in: Duration for signed URL if generating from private bucket.

    Returns:
        A displayable string URL or local filesystem path compatible with st.image().
    """
    if not image_ref:
        return None

    ref_str = str(image_ref).strip()

    # 1. Already an HTTP/HTTPS URL
    if ref_str.startswith(("http://", "https://")):
        return ref_str

    # 2. Local filesystem file that exists
    try:
        p = Path(ref_str)
        if p.exists() and p.is_file():
            return str(p)
    except Exception:
        pass

    # 3. Supabase Storage Object Path (e.g. 'reports/...' or filename)
    if config.is_supabase_storage():
        signed = get_signed_url(ref_str, expires_in=expires_in)
        if signed:
            return signed

    # 4. Fallback: check if file exists in local uploads directory
    try:
        local_candidate = config.UPLOADS_DIR / Path(ref_str).name
        if local_candidate.exists():
            return str(local_candidate)
    except Exception:
        pass

    return None


def download_image(object_path: str) -> bytes | None:
    """Download image bytes from private Supabase Storage (used for verification/testing)."""
    if not config.is_supabase_storage():
        return None
    client = get_storage_client()
    if client is None:
        return None
    bucket = config.SUPABASE_STORAGE_BUCKET
    return client.storage.from_(bucket).download(object_path)


def delete_image(object_path: str) -> bool:
    """Delete an image object from private Supabase Storage (used for cleanup)."""
    if not config.is_supabase_storage():
        return False
    try:
        client = get_storage_client()
        if client is None:
            return False
        bucket = config.SUPABASE_STORAGE_BUCKET
        client.storage.from_(bucket).remove([object_path])
        _SIGNED_URL_CACHE.pop(object_path, None)
        return True
    except Exception as e:
        logger.warning("Failed to delete image '%s' from storage: %s", object_path, e)
        return False
