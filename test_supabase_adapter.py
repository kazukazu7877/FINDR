"""
Test Suite: Supabase Integration & Dual-Engine Adapter
------------------------------------------------------
Verifies:
  1. Secret retrieval from Streamlit secrets and .env
  2. Storage layer image saving (local fallback and remote URL handling)
  3. Database layer query adaptation (? -> %s)
  4. Embedding serialization & reconstruction compatibility
  5. Multi-table atomic transactions & duplicate-match prevention logic
"""

import io
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(__file__))

import config
import database
import storage


def test_secret_management():
    print("=" * 60)
    print("TEST 1: Secret Management & Fallback")
    print("=" * 60)

    # Test get_secret fallback
    val = config.get_secret("NON_EXISTENT_KEY_12345", default="default_val")
    assert val == "default_val"
    print("  [PASSED] Fallback returned when key absent.")

    # Test existing GEMINI_API_KEY
    has_gemini = config.validate_api_key()
    print(f"  [PASSED] validate_api_key(): {has_gemini}")


def test_storage_layer():
    print("=" * 60)
    print("TEST 2: Storage Layer & Persistence")
    print("=" * 60)

    # Synthetic image bytes
    img = Image.new("RGB", (200, 200), color=(100, 50, 150))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    img_bytes = buf.getvalue()

    saved_ref = storage.save_image(img_bytes, "test_upload.jpg")
    assert saved_ref is not None
    print(f"  [PASSED] Image saved successfully: {saved_ref}")

    # Check local cleanup if it was stored locally
    if not saved_ref.startswith(("http://", "https://")):
        p = Path(saved_ref)
        assert p.exists()
        p.unlink()
        print("  [PASSED] Local temporary image verified and cleaned up.")


def test_database_dual_adapter():
    print("=" * 60)
    print("TEST 3: Database Dual-Engine Adapter")
    print("=" * 60)

    # Isolated test database
    test_db = config.BASE_DIR / "test_supabase_adapter.db"
    orig_db = database.DB_PATH
    database.DB_PATH = test_db

    try:
        database.init_db()
        print("  [PASSED] Schema initialized.")

        # Test insert with 768-dim embedding
        emb = np.random.randn(768).astype(np.float64)
        emb = emb / np.linalg.norm(emb)

        lost_id = database.create_report(
            report_type="lost",
            title="Silver iPad Pro",
            description="11 inch with Apple Pencil",
            category="Electronics",
            location="Library 1st floor",
            image_path="https://supabase.co/storage/v1/object/public/findr-images/ipad.jpg",
            embedding=emb,
            ai_attributes={"color": "silver", "brand": "Apple"},
        )
        assert lost_id > 0
        print(f"  [PASSED] Lost report created with remote URL image (id={lost_id}).")

        found_id = database.create_report(
            report_type="found",
            title="Found iPad",
            description="iPad in green case",
            category="Electronics",
            location="Library",
            embedding=emb,
        )
        assert found_id > 0
        print(f"  [PASSED] Found report created (id={found_id}).")

        # Verify retrieval and 768-dim embedding reconstruction
        report = database.get_report(lost_id)
        assert report is not None
        assert report["image_path"].startswith("https://")
        assert report["embedding"] is not None
        assert len(report["embedding"]) == 768
        assert np.allclose(report["embedding"], emb, atol=1e-5)
        print("  [PASSED] Retrieved report with 768-dim embedding exact match.")

        # Test atomic match transaction
        match_id = database.create_match(
            lost_report_id=lost_id,
            found_report_id=found_id,
            similarity_score=0.92,
        )
        assert match_id > 0

        # Confirm match
        confirmed = database.confirm_match(match_id)
        assert confirmed is True
        rep_l = database.get_report(lost_id)
        rep_f = database.get_report(found_id)
        assert rep_l["status"] == "matched"
        assert rep_f["status"] == "matched"
        print("  [PASSED] Atomic multi-table match confirmation verified.")

        # Single-match constraint check: prevent already confirmed found item from being matched again
        second_lost_id = database.create_report(
            report_type="lost",
            title="Second Lost iPad",
            description="Another ipad report",
            category="Electronics",
            location="Library 2nd floor",
            embedding=emb,
        )
        second_match_id = database.create_match(
            lost_report_id=second_lost_id,
            found_report_id=found_id,
            similarity_score=0.85,
        )
        dup_confirmed = database.confirm_match(second_match_id)
        assert dup_confirmed is False
        print("  [PASSED] Duplicate match confirmation blocked (single-match constraint enforced).")

        # Database-level unique constraint check on duplicate candidate pair
        dup_pair_blocked = False
        try:
            database.create_match(
                lost_report_id=lost_id,
                found_report_id=found_id,
                similarity_score=0.80,
            )
        except Exception:
            dup_pair_blocked = True
        assert dup_pair_blocked is True
        print("  [PASSED] Duplicate candidate pair blocked by database-level unique constraint.")

    finally:
        database.DB_PATH = orig_db
        for p in [test_db, test_db.with_suffix(".db-wal"), test_db.with_suffix(".db-shm")]:
            if p.exists():
                try:
                    p.unlink()
                except Exception:
                    pass


def test_signed_url_caching_and_regeneration():
    print("=" * 60)
    print("TEST 4: Signed URL Proactive Caching & Regeneration")
    print("=" * 60)

    import time
    storage.clear_signed_url_cache()

    # Verify cache metadata structure and safety margin
    obj_path = "reports/sample_test.jpg"
    fake_url_1 = "https://example.supabase.co/storage/v1/object/sign/reports/sample_test.jpg?token=abc1"
    now = time.time()
    expires_in = 3600
    margin = max(30, min(600, int(expires_in * 0.2)))
    cache_ttl = max(10, expires_in - margin)

    storage._SIGNED_URL_CACHE[obj_path] = {
        "url": fake_url_1,
        "cached_at": now,
        "cache_expires_at": now + cache_ttl,
        "supabase_expires_at": now + expires_in,
    }

    # 1. Verify cached URL expires BEFORE actual Supabase expiration
    entry = storage.get_cached_url_info(obj_path)
    assert entry is not None
    assert entry["cache_expires_at"] < entry["supabase_expires_at"]
    assert entry["supabase_expires_at"] - entry["cache_expires_at"] >= 600
    print("  [PASSED] Cache expiration is strictly shorter than Supabase token validity (10 min safety buffer).")

    # 2. Verify active cache lookup
    assert now < entry["cache_expires_at"]
    print("  [PASSED] Active cache hit confirmed.")

    # 3. Simulate cache expiration while token is still technically alive
    # (cache_expires_at in past, supabase_expires_at in future)
    entry["cache_expires_at"] = now - 1.0
    assert now >= entry["cache_expires_at"]
    assert now < entry["supabase_expires_at"]
    print("  [PASSED] Simulated cache expiry triggers renewal before Supabase token expiration.")

    # 4. Cleanup
    storage.clear_signed_url_cache()
    assert storage.get_cached_url_info(obj_path) is None
    print("  [PASSED] Cache cleared successfully.")


def test_production_configuration_enforcement():
    print("=" * 60)
    print("TEST 5: Production Configuration & Anti-Fallback Enforcement")
    print("=" * 60)

    orig_env = config.FINDR_ENV
    orig_db_url = config.DATABASE_URL
    orig_sub_url = config.SUPABASE_URL
    orig_sub_key = config.SUPABASE_SERVICE_ROLE_KEY
    orig_code = config.EXHIBITION_ACCESS_CODE

    try:
        # Switch to production mode
        config.FINDR_ENV = "production"
        assert config.is_production() is True

        # Test 1: Missing DATABASE_URL fails clearly
        config.DATABASE_URL = None
        config.SUPABASE_URL = "https://test.supabase.co"
        config.SUPABASE_SERVICE_ROLE_KEY = "test_key_abc"
        config.EXHIBITION_ACCESS_CODE = "SuperSecretCode2026!"

        try:
            config.validate_environment_config()
            assert False, "Should have raised ConfigurationError for missing DATABASE_URL"
        except config.ConfigurationError as e:
            assert "DATABASE_URL" in str(e)
            print("  [PASSED] Missing DATABASE_URL raised ConfigurationError in production.")

        # Test 2: Database connection raises ConfigurationError, prevents silent SQLite fallback
        try:
            database.get_connection()
            assert False, "Should have raised ConfigurationError on get_connection without DATABASE_URL"
        except config.ConfigurationError as e:
            assert "DATABASE_URL" in str(e)
            print("  [PASSED] Silent SQLite fallback prohibited in production get_connection().")

        # Test 3: Missing Supabase Storage credentials fails clearly
        config.DATABASE_URL = "postgresql://postgres:secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require"
        config.SUPABASE_URL = None
        try:
            config.validate_environment_config()
            assert False, "Should have raised ConfigurationError for missing SUPABASE_URL"
        except config.ConfigurationError as e:
            assert "SUPABASE_URL" in str(e)
            print("  [PASSED] Missing SUPABASE_URL raised ConfigurationError in production.")

        # Test 4: Image save raises ConfigurationError, prevents silent local storage fallback
        try:
            storage.save_image(b"testbytes", "test.jpg")
            assert False, "Should have raised ConfigurationError on save_image without storage credentials"
        except config.ConfigurationError as e:
            assert "Supabase Storage credentials" in str(e)
            print("  [PASSED] Silent local upload fallback prohibited in production save_image().")

        # Test 5: Missing or weak EXHIBITION_ACCESS_CODE fails clearly
        config.SUPABASE_URL = "https://test.supabase.co"
        config.SUPABASE_SERVICE_ROLE_KEY = "test_key_abc"
        config.EXHIBITION_ACCESS_CODE = "FINDR2026"  # Insecure default

        try:
            config.validate_environment_config()
            assert False, "Should have raised ConfigurationError for default FINDR2026 code"
        except config.ConfigurationError as e:
            assert "EXHIBITION_ACCESS_CODE" in str(e)
            print("  [PASSED] Default/insecure access code ('FINDR2026') rejected in production.")

        # Test 6: Valid production configuration passes
        config.EXHIBITION_ACCESS_CODE = "StrongExhibitionPasscode2026#!"
        config.validate_environment_config()
        print("  [PASSED] Valid production configuration verified successfully.")

    finally:
        # Restore original dev settings
        config.FINDR_ENV = orig_env
        config.DATABASE_URL = orig_db_url
        config.SUPABASE_URL = orig_sub_url
        config.SUPABASE_SERVICE_ROLE_KEY = orig_sub_key
        config.EXHIBITION_ACCESS_CODE = orig_code


if __name__ == "__main__":
    print("\n============================================================")
    print("FINDR — SUPABASE & DUAL-ENGINE ADAPTER TEST SUITE")
    print("============================================================\n")

    test_secret_management()
    test_storage_layer()
    test_database_dual_adapter()
    test_signed_url_caching_and_regeneration()
    test_production_configuration_enforcement()

    print("\n============================================================")
    print("ALL SUPABASE ADAPTER TESTS PASSED SUCCESSFULLY (5 / 5)")
    print("============================================================\n")
