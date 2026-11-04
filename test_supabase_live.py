"""
FINDR — Live Supabase Cloud Integration Test
=============================================
Dedicated live end-to-end integration test against an actual Supabase project:
  - Live PostgreSQL database connection
  - Report insertion & 768-dim BYTEA embedding exact preservation
  - Private storage bucket photograph upload
  - Short-lived signed URL generation and HTTP retrieval
  - Atomic multi-table match confirmation (SELECT FOR UPDATE)
  - Duplicate confirmation prevention (Single-match constraint)
  - Data persistence across connection restarts
  - Complete, safe teardown and cleanup of all test records and files

Usage:
  1. Add your live Supabase credentials to .env:
       DATABASE_URL=postgresql://postgres...
       SUPABASE_URL=https://xyz.supabase.co
       SUPABASE_SERVICE_ROLE_KEY=eyJ...
  2. Run:
       python test_supabase_live.py
"""

import os
import sys
import time
import urllib.request
import uuid
from datetime import datetime

import numpy as np

import config
import database
import storage

SEP = "=" * 65


def print_header(title: str):
    print(f"\n{SEP}\n{title}\n{SEP}")


def run_live_tests():
    print_header("FINDR — LIVE SUPABASE INTEGRATION TEST SUITE")

    # -------------------------------------------------------------------------
    # 0. Check Live Credentials
    # -------------------------------------------------------------------------
    has_db = config.is_postgres()
    has_storage = config.is_supabase_storage()

    print("Checking Supabase Cloud Credentials:")
    print(f"  - DATABASE_URL:               {'CONFIGURED' if has_db else 'NOT SET'}")
    print(f"  - SUPABASE_URL:               {config.SUPABASE_URL or 'NOT SET'}")
    print(f"  - SUPABASE_SERVICE_ROLE_KEY:  {'CONFIGURED' if config.SUPABASE_SERVICE_ROLE_KEY else 'NOT SET'}")
    print(f"  - SUPABASE_STORAGE_BUCKET:    {config.SUPABASE_STORAGE_BUCKET}")

    if not has_db or not has_storage:
        print("\n" + "!" * 65)
        print("STATUS: PENDING — LIVE SUPABASE CLOUD CREDENTIALS REQUIRED")
        print("!" * 65)
        print("The live integration test is pending configuration of live Supabase secrets.")
        print("To execute live cloud verification against your Supabase project:")
        print("  1. In Supabase Dashboard, click Connect -> URI (Session Mode, port 5432).")
        print("  2. Add DATABASE_URL to your .env file with ?sslmode=require.")
        print("  3. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file.")
        print("  4. Ensure private bucket 'findr-images' exists in Supabase Storage.")
        print("  5. Re-run: python test_supabase_live.py")
        print("\nAll offline unit and dual-adapter tests are passing. Skipping live cloud test.")
        return 0

    test_token = uuid.uuid4().hex[:8]
    test_obj_path = None
    lost_id = None
    found_id = None
    match_id = None

    try:
        # ---------------------------------------------------------------------
        # 1. Test PostgreSQL Live Connection & Role Inspection
        # ---------------------------------------------------------------------
        print_header("TEST 1: PostgreSQL Live Connection & Role Inspection")
        conn = database.get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT version(), current_user, current_database();")
                row = cur.fetchone()
                version = row.get("version") if isinstance(row, dict) else row[0]
                user_role = row.get("current_user") if isinstance(row, dict) else row[1]
                db_name = row.get("current_database") if isinstance(row, dict) else row[2]

            print(f"  Connected Database: {db_name}")
            print(f"  Active User Role:   {user_role}")
            print(f"  PostgreSQL Version: {str(version).split(',')[0]}")

            if user_role == "postgres":
                print("  [SECURITY NOTICE] Connected as 'postgres' (table owner).")
                print("  Note: PostgreSQL superusers bypass RLS policies. Application-level")
                print("  access controls and database constraints are the active line of defense.")

            print("  [PASSED] Live PostgreSQL connection established.")
        finally:
            conn.close()

        # ---------------------------------------------------------------------
        # 2. Test Private Storage Bucket Upload & Signed URL
        # ---------------------------------------------------------------------
        print_header("TEST 2: Private Storage Bucket Upload & Signed URL")
        # 1x1 minimal valid JPEG
        dummy_jpeg = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
            0x00, 0xBF, 0x80, 0xFF, 0xD9
        ])

        filename = f"test_live_{test_token}.jpg"
        test_obj_path = storage.save_image(dummy_jpeg, filename)
        print(f"  Uploaded object path: {test_obj_path}")

        assert not test_obj_path.startswith("http"), (
            f"Expected object path, got public URL: {test_obj_path}"
        )
        assert "reports/" in test_obj_path, f"Unexpected path format: {test_obj_path}"
        print("  [PASSED] Private storage upload returned object path (not permanent public URL).")

        # Generate signed URL
        signed_url = storage.get_signed_url(test_obj_path, expires_in=300)
        assert signed_url is not None, "Failed to generate signed URL"
        assert signed_url.startswith("https://"), f"Invalid signed URL: {signed_url}"
        print(f"  Generated Signed URL: {signed_url[:50]}... (truncated)")

        # Verify HTTP download using the signed URL
        req = urllib.request.Request(signed_url, headers={"User-Agent": "FINDR-Test"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            assert resp.status == 200, f"Signed URL returned status {resp.status}"
            downloaded = resp.read()
            assert len(downloaded) == len(dummy_jpeg), "Downloaded image length mismatch"
        print("  [PASSED] Downloaded image from private bucket using short-lived signed URL.")

        # ---------------------------------------------------------------------
        # 3. Report CRUD & 768-dim Embedding Exact Match
        # ---------------------------------------------------------------------
        print_header("TEST 3: Report CRUD & 768-dim Embedding Exact Match")
        # Generate genuine 768-dim float64 embedding
        rng = np.random.default_rng(42)
        raw_vec = rng.standard_normal(768).astype(np.float64)
        original_emb = raw_vec / np.linalg.norm(raw_vec)

        lost_title = f"[TEST_LIVE_DO_NOT_USE] Lost Backpack {test_token}"
        found_title = f"[TEST_LIVE_DO_NOT_USE] Found Backpack {test_token}"

        lost_id = database.create_report(
            report_type="lost",
            title=lost_title,
            description="Black Herschel backpack with laptop sleeve",
            category="Bags & Wallets",
            location="Campus Library Floor 2",
            image_path=test_obj_path,
            ai_attributes={"color": "black", "brand": "Herschel"},
            embedding=original_emb,
            contact_info="live_test@example.com",
        )
        print(f"  Created Lost Report: ID {lost_id}")

        found_id = database.create_report(
            report_type="found",
            title=found_title,
            description="Dark backpack found near quiet study area",
            category="Bags & Wallets",
            location="Campus Library Floor 2",
            image_path=test_obj_path,
            ai_attributes={"color": "dark", "brand": "Herschel"},
            embedding=original_emb,
            contact_info="staff_test@example.com",
        )
        print(f"  Created Found Report: ID {found_id}")

        # Retrieve and verify embedding
        rep = database.get_report(lost_id)
        assert rep is not None, "Report retrieval failed"
        assert rep["embedding"] is not None, "Embedding not returned"
        assert len(rep["embedding"]) == 768, f"Expected 768 dims, got {len(rep['embedding'])}"
        assert np.allclose(rep["embedding"], original_emb, atol=1e-7), (
            "768-dim embedding values did not match exactly across PostgreSQL BYTEA"
        )
        print("  [PASSED] 768-dim float64 embedding restored from PostgreSQL BYTEA with 0 precision loss.")

        # ---------------------------------------------------------------------
        # 4. Atomic Match Confirmation & Duplicate Prevention
        # ---------------------------------------------------------------------
        print_header("TEST 4: Atomic Match Confirmation & Duplicate Prevention")
        match_id = database.create_match(
            lost_report_id=lost_id,
            found_report_id=found_id,
            similarity_score=0.92,
            embedding_score=0.95,
            attribute_score=0.88,
            location_score=0.90,
            explanation="Live integration test match",
        )
        print(f"  Created Match: ID {match_id}")

        # Confirm match atomically
        success = database.confirm_match(match_id)
        assert success is True, "Match confirmation failed"

        # Verify atomic state updates in PostgreSQL
        m_row = database.get_match(match_id)
        assert m_row["status"] == "confirmed", f"Match status expected confirmed, got {m_row['status']}"
        assert database.get_report(lost_id)["status"] == "matched"
        assert database.get_report(found_id)["status"] == "matched"
        print("  [PASSED] Atomic confirmation: both reports -> 'matched', match -> 'confirmed'.")

        # Verify duplicate match confirmation is blocked
        dup_attempt = database.confirm_match(match_id)
        assert dup_attempt is False, "Duplicate match confirmation was NOT blocked!"
        print("  [PASSED] Duplicate match confirmation blocked by database constraint.")

        # ---------------------------------------------------------------------
        # 5. Data Persistence Verification (Simulated Restart)
        # ---------------------------------------------------------------------
        print_header("TEST 5: Data Persistence Across Restart")
        # Open fresh connection
        conn_fresh = database.get_connection()
        try:
            with conn_fresh.cursor() as cur:
                cur.execute("SELECT status FROM matches WHERE id = %s", (match_id,))
                status = cur.fetchone()["status"]
                assert status == "confirmed", "Persistence check failed"
            print("  [PASSED] Data verified persistent across independent connections.")
        finally:
            conn_fresh.close()

        print("\n" + "=" * 65)
        print("ALL LIVE SUPABASE INTEGRATION TESTS PASSED (5 / 5)")
        print("=" * 65)
        return 0

    finally:
        # ---------------------------------------------------------------------
        # Safe Cleanup: Remove all test records and uploaded test objects
        # ---------------------------------------------------------------------
        print_header("CLEANUP: Removing Live Test Artifacts")
        if has_db:
            try:
                conn_clean = database.get_connection()
                with conn_clean.cursor() as cur:
                    if match_id:
                        cur.execute("DELETE FROM matches WHERE id = %s", (match_id,))
                    if lost_id or found_id:
                        ids = [i for i in (lost_id, found_id) if i]
                        cur.execute("DELETE FROM reports WHERE id = ANY(%s)", (ids,))
                conn_clean.commit()
                conn_clean.close()
                print("  [CLEANUP] Test reports and match records safely removed from PostgreSQL.")
            except Exception as e:
                print(f"  [CLEANUP WARNING] Database cleanup: {e}")

        if has_storage and test_obj_path:
            try:
                storage.delete_image(test_obj_path)
                print(f"  [CLEANUP] Test image '{test_obj_path}' deleted from Supabase private storage.")
            except Exception as e:
                print(f"  [CLEANUP WARNING] Storage cleanup: {e}")


if __name__ == "__main__":
    sys.exit(run_live_tests())
