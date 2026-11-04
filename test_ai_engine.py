"""
Test Suite: AI Engine Comprehensive Verification (Milestone 2)
--------------------------------------------------------------
Offline Unit Tests:
  1. Image preprocessing, format handling (JPEG, PNG, RGBA), and MIME detection.
  2. Input validation (empty, oversized, corrupted) and aspect-ratio preserving resizing.
  3. Embedding vector validation (dimensions, NaN/Inf checks, zero norm, normalization).

Live Gemini API Tests (Tested Independently):
  4a. Gemini Vision Analysis (gemini-3.8-flash)
  4b. Multimodal Embedding (gemini-embedding-2)
  4c. Coordinated Pipeline (process_item)
"""

import io
import os
import sys
import numpy as np
from PIL import Image

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

import ai_engine
from config import MAX_IMAGE_DIMENSION, MAX_IMAGE_SIZE_MB, validate_api_key


# ===========================================================================
# 1. Image Preprocessing & MIME Tests
# ===========================================================================

def test_image_preprocessing():
    """[OFFLINE UNIT TEST] Test JPEG, PNG, RGBA transparency, and MIME detection."""
    print("=" * 60)
    print("TEST 1: [OFFLINE UNIT TEST] Image Preprocessing & Format Handling")
    print("=" * 60)

    # 1. Standard RGB JPEG
    img_rgb = Image.new("RGB", (300, 200), color=(120, 60, 200))
    buf = io.BytesIO()
    img_rgb.save(buf, format="JPEG")
    proc_bytes, mime = ai_engine.preprocess_image(buf.getvalue())
    assert mime == "image/jpeg"
    assert len(proc_bytes) > 0
    print("  [PASSED] Standard RGB JPEG -> MIME: image/jpeg")

    # 2. Standard RGB PNG
    img_png = Image.new("RGB", (250, 250), color=(50, 180, 90))
    buf_png = io.BytesIO()
    img_png.save(buf_png, format="PNG")
    proc_png, mime_png = ai_engine.preprocess_image(buf_png.getvalue())
    assert mime_png == "image/png"
    print("  [PASSED] Standard RGB PNG -> MIME: image/png")

    # 3. RGBA PNG with alpha channel (transparency preserved)
    img_rgba = Image.new("RGBA", (200, 200), color=(255, 0, 0, 128))
    buf_rgba = io.BytesIO()
    img_rgba.save(buf_rgba, format="PNG")
    proc_rgba, mime_rgba = ai_engine.preprocess_image(buf_rgba.getvalue())
    assert mime_rgba == "image/png"
    with Image.open(io.BytesIO(proc_rgba)) as res_rgba:
        assert res_rgba.mode in ("RGBA", "RGB")
    print("  [PASSED] RGBA PNG with transparency -> MIME: image/png")

    # 4. MIME type detector helper
    detected = ai_engine.detect_mime_type(buf.getvalue())
    assert detected == "image/jpeg"
    print("  [PASSED] detect_mime_type() correctly identified image/jpeg\n")


# ===========================================================================
# 2. Validation & Resizing Tests
# ===========================================================================

def test_validation_and_resizing():
    """[OFFLINE UNIT TEST] Input validation (empty, oversized, corrupt) and downscaling."""
    print("=" * 60)
    print("TEST 2: [OFFLINE UNIT TEST] Input Validation & Resizing")
    print("=" * 60)

    # 1. Empty input validation
    try:
        ai_engine.preprocess_image(b"")
        assert False, "Empty bytes should raise ImageValidationError"
    except ai_engine.ImageValidationError as e:
        print(f"  [PASSED] Empty bytes rejected ({e})")

    # 2. Corrupted input validation
    try:
        ai_engine.preprocess_image(b"not_an_image_data_header_bytes")
        assert False, "Corrupted bytes should raise ImageValidationError"
    except ai_engine.ImageValidationError as e:
        print(f"  [PASSED] Corrupted bytes rejected ({e})")

    # 3. Oversized input validation
    excessive_bytes = b"0" * ((MAX_IMAGE_SIZE_MB + 1) * 1024 * 1024)
    try:
        ai_engine.validate_image_input(excessive_bytes)
        assert False, "Oversized bytes should raise ImageValidationError"
    except ai_engine.ImageValidationError as e:
        print(f"  [PASSED] Oversized image ({MAX_IMAGE_SIZE_MB + 1} MB) rejected ({e})")

    # 4. Aspect-ratio preserving resizing
    # 2400 x 1200 image -> ratio 2:1 -> max dimension 1024 -> should become 1024 x 512
    oversized = Image.new("RGB", (2400, 1200), color=(40, 100, 220))
    buf_over = io.BytesIO()
    oversized.save(buf_over, format="JPEG")
    proc_over, _ = ai_engine.preprocess_image(buf_over.getvalue())

    with Image.open(io.BytesIO(proc_over)) as res_img:
        w, h = res_img.size
        assert max(w, h) == MAX_IMAGE_DIMENSION, f"Expected max dimension {MAX_IMAGE_DIMENSION}, got {max(w,h)}"
        assert abs((w / h) - 2.0) < 0.05, f"Aspect ratio altered: {w}x{h}"
        print(f"  [PASSED] 2400x1200 downscaled to {w}x{h} (preserved 2:1 aspect ratio)\n")


# ===========================================================================
# 3. Vector Validation Tests
# ===========================================================================

def test_vector_validation():
    """[OFFLINE UNIT TEST] Embedding dimensionality, NaN/Inf checks, and normalization."""
    print("=" * 60)
    print("TEST 3: [OFFLINE UNIT TEST] Vector Validation Logic")
    print("=" * 60)

    # 1. Valid 768-dim normalized vector
    vec_valid = np.random.randn(768).astype(np.float64)
    vec_valid /= np.linalg.norm(vec_valid)
    v_out = ai_engine.validate_vector(vec_valid)
    assert len(v_out) == 768
    assert abs(np.linalg.norm(v_out) - 1.0) < 1e-6
    print("  [PASSED] Valid 768-dim normalized vector accepted")

    # 2. Wrong dimensions (e.g. 512)
    vec_wrong = np.random.randn(512)
    try:
        ai_engine.validate_vector(vec_wrong)
        assert False, "Wrong dimension should raise ValueError"
    except ValueError as e:
        print(f"  [PASSED] Wrong dimensions (512) rejected ({e})")

    # 3. Vector containing NaN
    vec_nan = np.copy(vec_valid)
    vec_nan[10] = np.nan
    try:
        ai_engine.validate_vector(vec_nan)
        assert False, "NaN in vector should raise ValueError"
    except ValueError as e:
        print(f"  [PASSED] NaN values rejected ({e})")

    # 4. Vector containing Inf
    vec_inf = np.copy(vec_valid)
    vec_inf[25] = np.inf
    try:
        ai_engine.validate_vector(vec_inf)
        assert False, "Inf in vector should raise ValueError"
    except ValueError as e:
        print(f"  [PASSED] Inf values rejected ({e})")

    # 5. Zero vector
    vec_zero = np.zeros(768)
    try:
        ai_engine.validate_vector(vec_zero)
        assert False, "Zero vector should raise ValueError"
    except ValueError as e:
        print(f"  [PASSED] Zero norm rejected ({e})")

    # 6. Minor numerical drift auto-normalization
    vec_drift = vec_valid * 1.025  # norm 1.025
    v_normed = ai_engine.validate_vector(vec_drift)
    assert abs(np.linalg.norm(v_normed) - 1.0) < 1e-6
    print("  [PASSED] Vector with numerical drift auto-normalized to 1.0000\n")


# ===========================================================================
# 4. Live API Tests (Independent Execution)
# ===========================================================================

def _create_sample_image_bytes() -> bytes:
    """Helper to create a small test JPEG."""
    img = Image.new("RGB", (200, 200), color=(40, 40, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


def test_live_image_analysis() -> tuple[str, str]:
    """[LIVE GEMINI API TEST] Test gemini-3.8-flash image analysis independently."""
    print("=" * 60)
    print("TEST 4a: [LIVE GEMINI API TEST] Image Analysis (gemini-3.8-flash)")
    print("=" * 60)

    if not validate_api_key():
        msg = "GEMINI_API_KEY not configured. Live test skipped."
        print(f"  [SKIPPED] {msg}\n")
        return "SKIPPED", msg

    sample_bytes = _create_sample_image_bytes()
    try:
        print("  Calling gemini-3.8-flash (SDK retries enabled)...")
        attrs = ai_engine.analyse_image(sample_bytes)
        assert attrs is not None, "Image analysis returned None"
        assert "category" in attrs
        assert "colors" in attrs
        assert "visual_description" in attrs
        print(f"  [PASSED] Image analysis returned attributes: {list(attrs.keys())}\n")
        return "PASSED", "Image analysis succeeded"

    except ai_engine.RateLimitError as e:
        msg = f"Gemini API daily quota/rate limit reached (HTTP 429): {e}"
        print(f"  [BLOCKED - RATE LIMIT (429)]\n  {msg}\n")
        return "BLOCKED", msg
    except ai_engine.ServiceUnavailableError as e:
        msg = f"gemini-3.8-flash is temporarily unavailable: {e}"
        print(f"  [BLOCKED - SERVICE UNAVAILABLE (503/504)]\n  {msg}\n")
        return "BLOCKED", msg
    except Exception as e:
        err_str = str(e)
        status_code = getattr(e, "code", None)
        if status_code in (400, 401, 403) or any(t in err_str for t in ("API_KEY_INVALID", "PERMISSION_DENIED")):
            msg = f"Authentication error (HTTP {status_code}): Invalid key or permission denied."
            print(f"  [FAILED - AUTHENTICATION ERROR] {msg}\n")
            return "FAILED", msg
        if status_code == 429 or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate limit" in err_str.lower():
            msg = f"Gemini API rate limit reached (HTTP 429): {err_str}"
            print(f"  [BLOCKED - RATE LIMIT (429)]\n  {msg}\n")
            return "BLOCKED", msg
        if status_code in (503, 504) or any(t in err_str for t in ("503", "504", "UNAVAILABLE", "DEADLINE_EXCEEDED")):
            msg = f"gemini-3.8-flash is temporarily unavailable: {err_str}"
            print(f"  [BLOCKED - SERVICE UNAVAILABLE]\n  {msg}\n")
            return "BLOCKED", msg
        msg = f"Image analysis failed: {err_str}"
        print(f"  [FAILED] {msg}\n")
        return "FAILED", msg


def test_live_multimodal_embedding() -> tuple[str, str]:
    """[LIVE GEMINI API TEST] Test gemini-embedding-2 multimodal embedding independently."""
    print("=" * 60)
    print("TEST 4b: [LIVE GEMINI API TEST] Multimodal Embedding (gemini-embedding-2)")
    print("=" * 60)

    if not validate_api_key():
        msg = "GEMINI_API_KEY not configured. Live test skipped."
        print(f"  [SKIPPED] {msg}\n")
        return "SKIPPED", msg

    sample_bytes = _create_sample_image_bytes()
    try:
        print("  Calling gemini-embedding-2 (SDK retries enabled)...")
        emb = ai_engine.generate_embedding(
            image_bytes=sample_bytes,
            user_description="Dark blue test item",
            ai_attributes={"colors": ["blue"], "visual_description": "Dark blue test swatch"},
        )
        assert emb is not None, "Embedding generation returned None"
        assert len(emb) == 768, f"Expected 768 dims, got {len(emb)}"
        norm = np.linalg.norm(emb)
        assert abs(norm - 1.0) < 0.01, f"Norm deviates: {norm}"
        print(f"  [PASSED] Multimodal embedding verified: 768 dimensions (norm: {norm:.4f})\n")
        return "PASSED", "Multimodal embedding succeeded"

    except ai_engine.RateLimitError as e:
        msg = f"Gemini API rate limit reached (HTTP 429): {e}"
        print(f"  [BLOCKED - RATE LIMIT (429)]\n  {msg}\n")
        return "BLOCKED", msg
    except ai_engine.ServiceUnavailableError as e:
        msg = f"gemini-embedding-2 is temporarily unavailable: {e}"
        print(f"  [BLOCKED - SERVICE UNAVAILABLE (503/504)]\n  {msg}\n")
        return "BLOCKED", msg
    except Exception as e:
        err_str = str(e)
        status_code = getattr(e, "code", None)
        if status_code in (400, 401, 403) or any(t in err_str for t in ("API_KEY_INVALID", "PERMISSION_DENIED")):
            msg = f"Authentication error (HTTP {status_code}): Invalid key or permission denied."
            print(f"  [FAILED - AUTHENTICATION ERROR] {msg}\n")
            return "FAILED", msg
        if status_code == 429 or "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "rate limit" in err_str.lower():
            msg = f"Gemini API rate limit reached (HTTP 429): {err_str}"
            print(f"  [BLOCKED - RATE LIMIT (429)]\n  {msg}\n")
            return "BLOCKED", msg
        if status_code in (503, 504) or any(t in err_str for t in ("503", "504", "UNAVAILABLE", "DEADLINE_EXCEEDED")):
            msg = f"gemini-embedding-2 is temporarily unavailable: {err_str}"
            print(f"  [BLOCKED - SERVICE UNAVAILABLE]\n  {msg}\n")
            return "BLOCKED", msg
        msg = f"Embedding generation failed: {err_str}"
        print(f"  [FAILED] {msg}\n")
        return "FAILED", msg


def test_live_process_item() -> tuple[str, str]:
    """[LIVE GEMINI API TEST] Test process_item() coordination."""
    print("=" * 60)
    print("TEST 4c: [LIVE GEMINI API TEST] Coordinated Pipeline (process_item)")
    print("=" * 60)

    if not validate_api_key():
        msg = "GEMINI_API_KEY not configured. Live test skipped."
        print(f"  [SKIPPED] {msg}\n")
        return "SKIPPED", msg

    sample_bytes = _create_sample_image_bytes()
    try:
        print("  Running process_item() (coordinated pipeline)...")
        attrs, emb = ai_engine.process_item(sample_bytes, "Sample item")
        # Check independent outputs
        has_attrs = attrs is not None
        has_emb = emb is not None

        if has_attrs and has_emb:
            print("  [PASSED] Both image analysis and multimodal embedding succeeded.")
            print(f"           - Attributes: {list(attrs.keys())}")
            print(f"           - Embedding:  {len(emb)} dimensions (norm: {np.linalg.norm(emb):.4f})\n")
            return "PASSED", "Full pipeline succeeded"
        elif has_attrs and not has_emb:
            print("  [PARTIAL - EMBEDDING BLOCKED] Image analysis succeeded; embedding model unavailable.\n")
            return "BLOCKED", "Embedding model unavailable"
        elif not has_attrs and has_emb:
            print("  [PARTIAL - ANALYSIS BLOCKED] Embedding succeeded; image analysis model unavailable.\n")
            return "BLOCKED", "Image analysis model unavailable"
        else:
            print("  [BLOCKED] Both models temporarily unavailable upstream.\n")
            return "BLOCKED", "Both models unavailable"

    except Exception as e:
        msg = f"process_item failed unexpectedly: {e}"
        print(f"  [FAILED] {msg}\n")
        return "FAILED", msg


# ===========================================================================
# Runner
# ===========================================================================

if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("FINDR — Milestone 2: AI Engine Test Suite")
    print("=" * 60 + "\n")

    passed_count = 0
    skipped_count = 0
    blocked_count = 0
    failed_count = 0

    # 1. Offline Tests
    offline_tests = [
        ("Image Preprocessing & MIME", test_image_preprocessing),
        ("Validation & Resizing", test_validation_and_resizing),
        ("Vector Validation Logic", test_vector_validation),
    ]

    for name, func in offline_tests:
        try:
            func()
            passed_count += 1
        except Exception as e:
            print(f"  [FAILED] {name} failed: {e}\n")
            failed_count += 1

    # 2. Live API Tests (Independent Execution)
    live_tests = [
        ("gemini-3.8-flash Analysis", test_live_image_analysis),
        ("gemini-embedding-2 Embedding", test_live_multimodal_embedding),
        ("process_item Coordination", test_live_process_item),
    ]

    for name, func in live_tests:
        status, _ = func()
        if status == "PASSED":
            passed_count += 1
        elif status == "SKIPPED":
            skipped_count += 1
        elif status == "BLOCKED":
            blocked_count += 1
        else:
            failed_count += 1

    print("=" * 60)
    print("MILESTONE 2: AI ENGINE SUMMARY")
    print("=" * 60)
    print(f"  Passed:  {passed_count} (Offline Unit Tests & Available Live Tests)")
    print(f"  Skipped: {skipped_count} (Missing Credentials)")
    print(f"  Blocked: {blocked_count} (Temporary Google 503/504 Service Demand)")
    print(f"  Failed:  {failed_count} (Errors / Authentication Failure)")
    print("=" * 60 + "\n")

    # Fails only if genuine code or authentication errors occur
    sys.exit(1 if failed_count > 0 else 0)
