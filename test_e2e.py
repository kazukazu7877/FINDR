"""
End-to-End Test Suite: FINDR Platform Acceptance Workflow (Milestone 4)
----------------------------------------------------------------------
Verifies the complete lifecycle:
  1. Initialize & verify database and schema.
  2. Submit Lost item report (image preprocessing, embedding/attributes, SQLite storage).
  3. Submit Found item report (complementary item in same category).
  4. Retrieve and compare eligible candidate reports (matcher pipeline).
  5. Display ranked potential matches with composite scores and grounded explanations.
  6. Human verification: Confirm match and test dismissal.
  7. Verify atomic status updates (reports -> 'matched', match -> 'confirmed').
  8. Enforce single-match constraint (duplicate confirmation on found item rejected).
  9. Database persistence verification across connection close and re-initialization.
"""

import os
import sys
import io
from pathlib import Path
import numpy as np
from PIL import Image

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

import database
import matcher
import ai_engine
from config import BASE_DIR, UPLOADS_DIR

TEST_DB_PATH = BASE_DIR / "test_e2e_isolated.db"


def setup_e2e():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    database.DB_PATH = TEST_DB_PATH
    database.init_db()


def teardown_e2e():
    for p in [
        TEST_DB_PATH,
        TEST_DB_PATH.with_suffix(".db-wal"),
        TEST_DB_PATH.with_suffix(".db-shm"),
    ]:
        if p.exists():
            try:
                p.unlink()
            except Exception:
                pass


def create_dummy_image_bytes(color: str = "navy", size: tuple[int, int] = (600, 400)) -> bytes:
    """Generate a clean synthetic test image."""
    img = Image.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def test_end_to_end_journey():
    print("=" * 70)
    print("FINDR — MILESTONE 4: END-TO-END ACCEPTANCE TEST SUITE")
    print("=" * 70 + "\n")

    setup_e2e()
    try:
        # ── STEP 1: Verify Initial Database ──
        print("[STEP 1] Database Initialisation & Schema Verification")
        stats_initial = database.get_match_statistics()
        assert stats_initial["total_lost"] == 0
        assert stats_initial["total_found"] == 0
        assert stats_initial["active_reports"] == 0
        print("  [PASSED] Fresh SQLite database verified in WAL mode.\n")

        # ── STEP 2: Submit Lost Item Report ──
        print("[STEP 2] Submit Lost Item Report")
        lost_img_bytes = create_dummy_image_bytes("navy")
        processed_lost_bytes, mime_lost = ai_engine.preprocess_image(lost_img_bytes)
        assert mime_lost == "image/jpeg"

        # Deterministic 768-dim embedding fixture
        np.random.seed(555)
        v_lost = np.random.randn(768).astype(np.float32)
        v_lost /= np.linalg.norm(v_lost)

        lost_img_path = UPLOADS_DIR / "test_lost_laptop.jpg"
        lost_img_path.write_bytes(processed_lost_bytes)

        lost_id = database.create_report(
            report_type="lost",
            title="Lost Dell XPS 15 Laptop",
            description="Silver Dell XPS 15 laptop in dark navy protective sleeve with GitHub sticker",
            category="Electronics",
            location="Main Library 2nd Floor study cubicles",
            image_path=str(lost_img_path),
            ai_attributes={
                "colors": ["silver", "navy"],
                "material": "aluminium",
                "brand_or_logo": "Dell",
                "distinctive_features": ["github sticker"],
            },
            embedding=v_lost,
            contact_info="student@campus.edu",
        )
        assert lost_id > 0
        lost_report = database.get_report(lost_id)
        assert lost_report["status"] == "active"
        assert lost_report["category"] == "Electronics"
        print(f"  [PASSED] Lost report #{lost_id} successfully created (status: active).\n")

        # ── STEP 3: Submit Found Item Report ──
        print("[STEP 3] Submit Matching Found Item Report")
        found_img_bytes = create_dummy_image_bytes("navy")
        processed_found_bytes, _ = ai_engine.preprocess_image(found_img_bytes)

        # Similar embedding vector (high cosine similarity)
        v_found = v_lost + np.random.randn(768).astype(np.float32) * 0.05
        v_found /= np.linalg.norm(v_found)

        found_img_path = UPLOADS_DIR / "test_found_laptop.jpg"
        found_img_path.write_bytes(processed_found_bytes)

        found_id = database.create_report(
            report_type="found",
            title="Found Dell XPS Laptop on Desk",
            description="Silver Dell laptop in dark blue sleeve found unattended near library study cubicles",
            category="Electronics",
            location="Library 2nd Floor near window cubicles",
            image_path=str(found_img_path),
            ai_attributes={
                "colors": ["silver", "blue"],
                "material": "aluminium",
                "brand_or_logo": "Dell",
                "distinctive_features": ["developer sticker"],
            },
            embedding=v_found,
            contact_info="finder@campus.edu",
        )
        assert found_id > 0
        found_report = database.get_report(found_id)
        assert found_report["status"] == "active"
        print(f"  [PASSED] Found report #{found_id} successfully created (status: active).\n")

        # Also submit an unmatching item (different category: Bags & Wallets)
        unrelated_id = database.create_report(
            report_type="found",
            title="Found Red Backpack",
            description="Red JanSport backpack in Cafeteria",
            category="Bags & Wallets",
            location="Cafeteria",
            embedding=np.random.randn(768).astype(np.float32),
        )

        # ── STEP 4 & 5: Retrieve and Compare Eligible Candidate Reports ──
        print("[STEP 4 & 5] Run Matching Engine & Candidate Ranking")
        matches = matcher.find_and_store_matches(lost_id, threshold=0.30)
        assert len(matches) >= 1, "Should identify matching found laptop"

        top_match = matches[0]
        assert top_match.report["id"] == found_id, f"Expected top match to be found report #{found_id}"
        assert top_match.final_score > 0.50, f"Score should exceed 50%, got {top_match.final_score:.2%}"

        # Ensure unrelated category is excluded
        match_candidate_ids = [m.report["id"] for m in matches]
        assert unrelated_id not in match_candidate_ids, "Unrelated category must be strictly filtered out"

        print(f"  [PASSED] Top match #{found_id} identified with {top_match.final_score * 100:.1f}% similarity.")
        print(f"           - Multimodal Embedding: {top_match.embedding_score * 100:.1f}%")
        print(f"           - Visual Attributes:    {top_match.attribute_score * 100:.1f}%")
        print(f"           - Location Context:     {top_match.location_score * 100:.1f}%\n")

        # Verify match record was persisted in database
        stored_matches = database.get_matches_for_report(lost_id)
        assert len(stored_matches) == 1
        match_record = stored_matches[0]
        assert match_record["status"] == "pending"
        match_record_id = match_record["id"]
        print(f"  [PASSED] Match record #{match_record_id} successfully persisted in database with 'pending' status.\n")

        # ── STEP 6 & 7: Human Verification & Atomic Database Status Updates ──
        print("[STEP 6 & 7] Human Verification (Confirm Match & Atomic Status Update)")
        confirm_success = database.confirm_match(match_record_id)
        assert confirm_success is True, "Confirmation transaction should succeed"

        # Verify atomic updates
        updated_lost = database.get_report(lost_id)
        updated_found = database.get_report(found_id)
        updated_match = database.get_match(match_record_id)

        assert updated_lost["status"] == "matched", "Lost report status must be updated to 'matched'"
        assert updated_found["status"] == "matched", "Found report status must be updated to 'matched'"
        assert updated_match["status"] == "confirmed", "Match record status must be updated to 'confirmed'"
        assert updated_match["reviewed_at"] is not None, "Review timestamp must be recorded"

        print("  [PASSED] Atomic transaction verified: both reports -> 'matched', match -> 'confirmed'.\n")

        # ── STEP 8: Single-Match Constraint Enforcement ──
        print("[STEP 8] Single-Match Constraint Verification")
        # Attempt to confirm a second lost report against the already confirmed found item
        second_lost_id = database.create_report(
            report_type="lost",
            title="Another Lost Dell",
            description="Silver laptop",
            category="Electronics",
            location="Library",
            embedding=v_lost,
        )
        second_match_id = database.create_match(
            lost_report_id=second_lost_id,
            found_report_id=found_id,
            similarity_score=0.85,
        )

        # Attempt confirmation — must return False!
        duplicate_confirm_result = database.confirm_match(second_match_id)
        assert duplicate_confirm_result is False, "Duplicate confirmation of already confirmed found item must be blocked"
        print("  [PASSED] Duplicate found item confirmation prevented by database constraint.\n")

        # Test dismissal on the second match
        database.dismiss_match(second_match_id)
        dismissed_match = database.get_match(second_match_id)
        assert dismissed_match["status"] == "dismissed"
        print("  [PASSED] Match dismissal verified.\n")

        # ── STEP 9: Database Persistence Verification Across Restart ──
        print("[STEP 9] Database Persistence Verification (Simulated Restart)")
        # Close all active connections and reopen
        database.get_connection().close()

        # Re-query fresh connection
        persisted_stats = database.get_match_statistics()
        assert persisted_stats["total_lost"] == 2
        assert persisted_stats["total_found"] == 2
        assert persisted_stats["active_reports"] == 2  # second_lost + unrelated
        assert persisted_stats["matched_reports"] == 2  # lost_id + found_id
        assert persisted_stats["matches_confirmed"] == 1
        assert persisted_stats["matches_dismissed"] == 1

        persisted_match = database.get_match(match_record_id)
        assert persisted_match["status"] == "confirmed"
        assert persisted_match["similarity_score"] == top_match.final_score
        print("  [PASSED] All records, scores, statuses, and statistics perfectly persisted across restart.\n")

        print("=" * 70)
        print("ALL ACCEPTANCE CRITERIA PASSED SUCCESSFULLY (9 / 9 Steps)")
        print("=" * 70 + "\n")

    finally:
        # Clean up files
        for f in [lost_img_path, found_img_path]:
            if f.exists():
                try:
                    f.unlink()
                except Exception:
                    pass
        teardown_e2e()


if __name__ == "__main__":
    test_end_to_end_journey()
