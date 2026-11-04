"""
FINDR AI Engine
---------------
Handles all AI operations via the official google-genai SDK:
  1. Pillow image validation, MIME detection, format handling (JPEG/PNG/RGBA), and resizing.
  2. Structured image analysis via gemini-3.8-flash (no hallucination rule).
  3. Multimodal joint text+image embeddings via gemini-embedding-2 (768 dimensions, vector validation).
  4. Coordinated process_item() pipeline with independent model failure tolerance.

Pipeline dependency: image analysis runs first so extracted attributes can enrich
the text portion of the multimodal embedding. However, a failure in image analysis
does NOT block embedding generation (and vice versa).
"""

import io
import json
import logging
from typing import Any

import numpy as np
from PIL import Image, UnidentifiedImageError
from google import genai
from google.genai import types

from config import (
    GEMINI_API_KEY,
    GENERATION_MODEL,
    EMBEDDING_MODEL,
    EMBEDDING_DIMENSIONS,
    MAX_IMAGE_DIMENSION,
    MAX_IMAGE_SIZE_MB,
    SUPPORTED_MIME_TYPES,
    validate_api_key,
    get_http_options,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client Initialisation
# ---------------------------------------------------------------------------

_client: genai.Client | None = None
_client_key: str | None = None


def reset_client(api_key: str | None = None) -> None:
    """Reset the cached Gemini client instance."""
    global _client, _client_key
    _client = None
    _client_key = None
    if api_key:
        import os
        os.environ["GEMINI_API_KEY"] = api_key.strip()


def _get_client() -> genai.Client:
    """Lazily initialise and return the Gemini client with SDK-level bounded retries."""
    global _client, _client_key
    import config
    current_key = config.get_gemini_api_key()
    if not current_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. "
            "Please provide an API key in the sidebar or configure secrets / .env."
        )
    if _client is None or _client_key != current_key:
        _client = genai.Client(
            api_key=current_key,
            http_options=get_http_options(),
        )
        _client_key = current_key
    return _client


# ---------------------------------------------------------------------------
# Custom Exceptions
# ---------------------------------------------------------------------------

class ImageValidationError(ValueError):
    """Raised when uploaded image bytes are empty, oversized, or unreadable."""
    pass


class RateLimitError(Exception):
    """Raised when the Gemini API rate limit or quota is exceeded (HTTP 429)."""
    pass


class ServiceUnavailableError(Exception):
    """Raised when the Gemini service is temporarily overloaded or unavailable (HTTP 503/504)."""
    pass


# ---------------------------------------------------------------------------
# Image Preprocessing & Validation
# ---------------------------------------------------------------------------

def validate_image_input(image_bytes: bytes) -> None:
    """Validate that image bytes are non-empty and within size constraints.

    Raises:
        ImageValidationError: If bytes are empty or exceed MAX_IMAGE_SIZE_MB.
    """
    if not image_bytes:
        raise ImageValidationError("Image data is empty (0 bytes provided).")

    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > MAX_IMAGE_SIZE_MB:
        raise ImageValidationError(
            f"Image size ({size_mb:.2f} MB) exceeds maximum allowed size of {MAX_IMAGE_SIZE_MB} MB."
        )


def detect_mime_type(image_bytes: bytes) -> str:
    """Detect the actual MIME type of the image bytes using Pillow.

    Returns:
        MIME type string (e.g., 'image/jpeg', 'image/png', 'image/webp').
        Falls back to 'image/jpeg' if detection is indeterminate.
    """
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            fmt = img.format
            if fmt:
                mime = f"image/{fmt.lower()}"
                if mime == "image/jpg":
                    mime = "image/jpeg"
                if mime in SUPPORTED_MIME_TYPES:
                    return mime
    except Exception:
        pass
    return "image/jpeg"


def preprocess_image(image_bytes: bytes) -> tuple[bytes, str]:
    """Validate, format-normalize, and downscale an image as needed.

    Features:
      - Validates input presence and size constraints.
      - Full JPEG, PNG, and RGBA (alpha transparency) support.
      - Converts palette/alpha modes to RGB when writing JPEG output.
      - Preserves PNG transparency when source format is PNG.
      - Proportional downscaling so the longest edge <= MAX_IMAGE_DIMENSION.
      - Returns (processed_bytes, detected_mime_type).

    Raises:
        ImageValidationError: If image bytes are corrupted, empty, or oversized.
    """
    validate_image_input(image_bytes)

    try:
        img = Image.open(io.BytesIO(image_bytes))
    except (UnidentifiedImageError, OSError) as e:
        raise ImageValidationError(f"Invalid or corrupted image data: {e}") from e

    try:
        original_format = img.format  # e.g. 'JPEG', 'PNG', 'WEBP'
        mime_candidate = f"image/{original_format.lower()}" if original_format else ""

        # Determine output format and handle transparency
        if original_format == "PNG" or mime_candidate == "image/png":
            output_format = "PNG"
            # Keep RGBA or RGB for PNG
            if img.mode not in ("RGB", "RGBA"):
                img = img.convert("RGBA" if "transparency" in img.info or img.mode == "P" else "RGB")
        else:
            output_format = "JPEG"
            # Flatten transparency to clean RGB for JPEG
            if img.mode in ("RGBA", "LA", "P"):
                # Create white background for alpha composite
                if img.mode != "RGBA":
                    img = img.convert("RGBA")
                background = Image.new("RGB", img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[3])  # 3 is the alpha channel
                img = background
            elif img.mode != "RGB":
                img = img.convert("RGB")

        # Proportional resize if longest edge exceeds MAX_IMAGE_DIMENSION
        orig_width, orig_height = img.size
        max_dim = max(orig_width, orig_height)
        if max_dim > MAX_IMAGE_DIMENSION:
            scale = MAX_IMAGE_DIMENSION / max_dim
            new_size = (max(1, int(orig_width * scale)), max(1, int(orig_height * scale)))
            img = img.resize(new_size, Image.LANCZOS)
            logger.info(f"Resized image from {orig_width}x{orig_height} to {new_size[0]}x{new_size[1]}")

        # Export to bytes
        buf = io.BytesIO()
        save_kwargs: dict[str, Any] = {}
        if output_format == "JPEG":
            save_kwargs["quality"] = 85
            save_kwargs["optimize"] = True
        elif output_format == "PNG":
            save_kwargs["optimize"] = True

        img.save(buf, format=output_format, **save_kwargs)
        processed_bytes = buf.getvalue()

        final_mime = f"image/{output_format.lower()}"
        return processed_bytes, final_mime

    finally:
        img.close()


# ---------------------------------------------------------------------------
# Vector Validation
# ---------------------------------------------------------------------------

def validate_vector(vector: np.ndarray, expected_dims: int = EMBEDDING_DIMENSIONS) -> np.ndarray:
    """Validate numerical integrity and dimensionality of an embedding vector.

    Checks:
      1. Correct length / dimensionality (default 768).
      2. No NaN or Infinite values.
      3. Finite, non-zero L2 norm.
      4. Verifies unit length; normalizes if minor numerical drift occurs.

    Returns:
        L2-normalized float64 numpy array.

    Raises:
        ValueError: If vector has wrong dimensions, contains NaN/Inf, or has zero norm.
    """
    if not isinstance(vector, np.ndarray):
        vector = np.array(vector, dtype=np.float64)
    else:
        vector = vector.astype(np.float64)

    # 1. Dimensionality
    if len(vector) != expected_dims:
        raise ValueError(
            f"Embedding dimensionality mismatch: got {len(vector)}, expected {expected_dims}."
        )

    # 2. NaN / Inf
    if np.isnan(vector).any():
        raise ValueError("Embedding contains NaN values.")
    if np.isinf(vector).any():
        raise ValueError("Embedding contains infinite values.")

    # 3. Norm check
    norm = float(np.linalg.norm(vector))
    if norm == 0.0 or not np.isfinite(norm):
        raise ValueError(f"Invalid embedding norm ({norm}); zero or non-finite vector.")

    # 4. Safe normalization if minor deviation from 1.0 exists
    if abs(norm - 1.0) > 0.01:
        vector = vector / norm

    return vector


# ---------------------------------------------------------------------------
# Gemini Image Analysis (gemini-3.8-flash)
# ---------------------------------------------------------------------------

_ANALYSIS_PROMPT = """Analyse this image of a lost or found item. Extract the following attributes and return ONLY valid JSON with this exact structure:

{
    "category": "the most appropriate category for this item",
    "colors": ["list", "of", "main", "colors"],
    "material": "the material if visually identifiable, otherwise unknown",
    "brand_or_logo": "any visible brand name or logo text, otherwise unknown",
    "distinctive_features": ["list", "of", "notable", "features"],
    "condition": "brief description of item condition (e.g. good, worn, damaged)",
    "visual_description": "a concise one-sentence description of the item as seen in the image"
}

RULES:
- Return ONLY the JSON object, no Markdown backticks, no other text.
- For "material": only state what you can clearly see. If uncertain, return "unknown".
- For "brand_or_logo": only state text or logos you can clearly read/see. If uncertain, return "unknown".
- Do NOT invent, guess, or assume brands or materials you cannot visually verify.
- Keep "distinctive_features" to visually observable features only.
- Keep "visual_description" factual and under 30 words.
"""


def analyse_image(image_bytes: bytes) -> dict[str, Any] | None:
    """Send an image to gemini-3.8-flash for structured attribute extraction.

    Returns:
        Dict of extracted attributes, or None on failure.
        Never fabricates or hallucinates attributes.

    Raises:
        ImageValidationError: If the image bytes fail preprocessing/validation.
        RateLimitError: If HTTP 429 quota is reached.
        ServiceUnavailableError: If HTTP 503/504 or upstream timeouts persist.
    """
    client = _get_client()

    processed_bytes, mime_type = preprocess_image(image_bytes)

    try:
        response = client.models.generate_content(
            model=GENERATION_MODEL,
            contents=[
                types.Part.from_bytes(data=processed_bytes, mime_type=mime_type),
                _ANALYSIS_PROMPT,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
            ),
        )

        if not response.text:
            logger.error("Gemini returned empty response for image analysis")
            return None

        # Clean text if wrapped in markdown code fence
        raw_text = response.text.strip()
        if raw_text.startswith("```"):
            lines = raw_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            raw_text = "\n".join(lines).strip()

        attributes = json.loads(raw_text)

        # Validate expected keys and populate safe defaults
        required_keys = {
            "category", "colors", "material", "brand_or_logo",
            "distinctive_features", "condition", "visual_description",
        }
        missing = required_keys - set(attributes.keys())
        if missing:
            logger.warning(f"AI response missing keys: {missing}")
            for key in missing:
                if key in ("colors", "distinctive_features"):
                    attributes[key] = []
                else:
                    attributes[key] = "unknown"

        return attributes

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        return None
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            logger.error(f"Gemini rate limit reached: {e}")
            raise RateLimitError("Gemini API rate limit reached. Please wait and retry.") from e
        if any(token in error_msg for token in ("503", "504", "UNAVAILABLE", "DEADLINE_EXCEEDED", "timed out", "timeout")):
            logger.warning(f"Gemini service unavailable / timed out: {e}")
            raise ServiceUnavailableError(f"Gemini service is temporarily experiencing high demand: {e}") from e
        logger.error(f"Image analysis failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Multimodal Embedding (gemini-embedding-2)
# ---------------------------------------------------------------------------

def generate_embedding(
    image_bytes: bytes,
    user_description: str,
    ai_attributes: dict[str, Any] | None = None,
) -> np.ndarray | None:
    """Generate a unified multimodal embedding from image + text in a single request.

    Combines the uploaded image and accompanying text description into a
    single unified multimodal embedding request. If ai_attributes are available,
    they are incorporated to enrich the text context.

    Returns:
        L2-normalized 768-dimensional numpy array, or None on failure.

    Raises:
        ImageValidationError: If the image bytes fail preprocessing/validation.
        RateLimitError: If HTTP 429 quota is reached.
        ServiceUnavailableError: If HTTP 503/504 or upstream timeouts persist.
    """
    client = _get_client()

    processed_bytes, mime_type = preprocess_image(image_bytes)

    # Build combined text representation
    text_parts = [user_description.strip()] if user_description else []

    if ai_attributes:
        if ai_attributes.get("visual_description") and ai_attributes["visual_description"] != "unknown":
            text_parts.append(ai_attributes["visual_description"])
        if ai_attributes.get("colors"):
            colors = [c for c in ai_attributes["colors"] if c and c != "unknown"]
            if colors:
                text_parts.append(f"Colors: {', '.join(colors)}")
        if ai_attributes.get("material") and ai_attributes["material"] != "unknown":
            text_parts.append(f"Material: {ai_attributes['material']}")
        if ai_attributes.get("brand_or_logo") and ai_attributes["brand_or_logo"] != "unknown":
            text_parts.append(f"Brand: {ai_attributes['brand_or_logo']}")
        if ai_attributes.get("distinctive_features"):
            features = [f for f in ai_attributes["distinctive_features"] if f]
            if features:
                text_parts.append(f"Features: {', '.join(features)}")

    combined_text = ". ".join(text_parts) if text_parts else "Item photograph"

    try:
        response = client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=[
                combined_text,
                types.Part.from_bytes(data=processed_bytes, mime_type=mime_type),
            ],
            config=types.EmbedContentConfig(
                output_dimensionality=EMBEDDING_DIMENSIONS,
            ),
        )

        raw_values = response.embeddings[0].values
        vector = np.array(raw_values, dtype=np.float64)

        # Validate dimensions and numerical values (no NaN, no Inf, unit norm)
        validated_vector = validate_vector(vector, expected_dims=EMBEDDING_DIMENSIONS)
        return validated_vector

    except (ValueError, TypeError) as e:
        logger.error(f"Vector validation error: {e}")
        return None
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
            logger.error(f"Gemini rate limit reached: {e}")
            raise RateLimitError("Gemini API rate limit reached. Please wait and retry.") from e
        if any(token in error_msg for token in ("503", "504", "UNAVAILABLE", "DEADLINE_EXCEEDED", "timed out", "timeout")):
            logger.warning(f"Gemini service unavailable / timed out: {e}")
            raise ServiceUnavailableError(f"Gemini service is temporarily experiencing high demand: {e}") from e
        logger.error(f"Embedding generation failed: {e}")
        return None


# ---------------------------------------------------------------------------
# Coordinated Pipeline (process_item)
# ---------------------------------------------------------------------------

def process_item(
    image_bytes: bytes,
    user_description: str,
) -> tuple[dict[str, Any] | None, np.ndarray | None]:
    """Coordinate image preprocessing, structured analysis, and multimodal embedding.

    Independent Model Tolerance:
      - Validates and preprocesses image first.
      - Executes gemini-3.8-flash for structured analysis.
        If it encounters 503/timeout, it logs the outage but does NOT block embeddings.
      - Executes gemini-embedding-2 for multimodal embedding.
        Uses user description + image bytes (plus any extracted attributes if available).
        If embedding generation encounters 503/timeout, it logs the outage but does NOT
        discard a successful image analysis.
      - Returns (ai_attributes, embedding). Either or both may be None depending on
        upstream service availability. Never returns fabricated results.
    """
    # 1. Image preprocessing and validation (fails fast if corrupted/invalid)
    processed_bytes, _ = preprocess_image(image_bytes)

    # 2. Image analysis (gemini-3.8-flash)
    ai_attributes: dict[str, Any] | None = None
    try:
        ai_attributes = analyse_image(processed_bytes)
    except (ServiceUnavailableError, RateLimitError) as e:
        logger.warning(f"Image analysis model unavailable: {e}")
    except Exception as e:
        logger.error(f"Unexpected image analysis error: {e}")

    # 3. Multimodal embedding (gemini-embedding-2)
    embedding: np.ndarray | None = None
    try:
        embedding = generate_embedding(
            image_bytes=processed_bytes,
            user_description=user_description,
            ai_attributes=ai_attributes,
        )
    except (ServiceUnavailableError, RateLimitError) as e:
        logger.warning(f"Embedding model unavailable: {e}")
    except Exception as e:
        logger.error(f"Unexpected embedding generation error: {e}")

    return ai_attributes, embedding
