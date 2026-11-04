"""
Test Suite: Matcher Engine (Milestone 3)
----------------------------------------
Exhaustive verification of the FINDR matching engine:
  1. Vector Validation & Numerical Edge Cases (NaN, Inf, dims, norm)
  2. Cosine Similarity & Bounded Score Mapping ([0.0, 1.0])
  3. Multimodal Similarity with Missing & Invalid Embeddings
  4. Visual Attribute Matching (Colors, Materials, Brands, Features)
  5. Missing & Unknown Attribute Handling (No false mismatch penalty)
  6. Location Context Token Similarity & Stopword Removal
  7. Dynamic Weight Renormalization & Composite Scoring
  8. Candidate Eligibility Filtering (Opposite type, strict category, active status, self-exclusion)
  9. Candidate Ranking & Limit Enforcement
  10. Threshold Pruning & No-Match Scenarios
  11. Grounded Match Explanations & Ownership Disclaimer
  12. Stored Match Deduplication (Prevent duplicate candidate pairs)

All tests use deterministic numerical fixtures.
NO external Gemini API calls are made during matching tests.
"""

import os
import sys
from pathlib import Path
import numpy as np

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(__file__))

import database
import matcher
from config import (
    BASE_DIR,
    WEIGHT_EMBEDDING,
    WEIGHT_ATTRIBUTE,
    WEIGHT_LOCATION,
    EMBEDDING_DIMENSIONS,
    MATCH_THRESHOLD,
    MAX_MATCHES,
)

# Use dedicated isolated test database to protect any live dev data
TEST_DB_PATH = BASE_DIR / "test_matcher_isolated.db"


def setup_test_db():
    """Point database module to a fresh isolated test database."""
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()
    database.DB_PATH = TEST_DB_PATH
    database.init_db()


def teardown_test_db():
    """Clean up isolated test database files."""
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


# ---------------------------------------------------------------------------
# TEST 1: Vector Validation & Numerical Edge Cases
# ---------------------------------------------------------------------------
def test_vector_validation_and_edge_cases():
    """Validate 768-dim embeddings, rejecting wrong dims, NaNs, Infs, and zero norms."""
    print("=" * 65)
    print("TEST 1: Vector Validation & Edge Cases (is_valid_vector)")
    print("=" * 65)

    # 1. Valid 768-dim vector
    v_valid = np.random.randn(768).astype(np.float32)
    v_valid /= np.linalg.norm(v_valid)
    assert matcher.is_valid_vector(v_valid), "Valid 768-dim vector should pass"

    # 2. Python list of 768 floats
    list_valid = v_valid.tolist()
    assert matcher.is_valid_vector(list_valid), "Valid Python list of 768 floats should pass"

    # 3. Wrong dimensions
    assert not matcher.is_valid_vector(np.ones(512)), "512-dim vector should fail"
    assert not matcher.is_valid_vector(np.ones(1024)), "1024-dim vector should fail"
    assert not matcher.is_valid_vector(np.array([])), "Empty vector should fail"

    # 4. Multi-dimensional array
    v_2d = np.ones((768, 1))
    assert not matcher.is_valid_vector(v_2d), "2D array should fail"

    # 5. NaN values
    v_nan = v_valid.copy()
    v_nan[10] = np.nan
    assert not matcher.is_valid_vector(v_nan), "Vector with NaN must fail"

    # 6. Infinite values
    v_inf = v_valid.copy()
    v_inf[42] = np.inf
    assert not matcher.is_valid_vector(v_inf), "Vector with Inf must fail"
    v_neginf = v_valid.copy()
    v_neginf[42] = -np.inf
    assert not matcher.is_valid_vector(v_neginf), "Vector with -Inf must fail"

    # 7. Zero norm (all zeros)
    v_zero = np.zeros(768)
    assert not matcher.is_valid_vector(v_zero), "All-zero vector must fail (norm=0)"

    # 8. None and invalid types
    assert not matcher.is_valid_vector(None), "None must fail"
    assert not matcher.is_valid_vector("not a vector"), "String must fail"
    assert not matcher.is_valid_vector({"a": 1}), "Dict must fail"

    print("  [PASSED] Vector validation handles valid, dimension mismatch, NaN, Inf, and zero norms.\n")


# ---------------------------------------------------------------------------
# TEST 2: Cosine Similarity & Score Mapping
# ---------------------------------------------------------------------------
def test_cosine_similarity_and_score_mapping():
    """Verify cosine calculation, float drift clamping, and mapping to [0.0, 1.0]."""
    print("=" * 65)
    print("TEST 2: Cosine Similarity Calculation & Bounded Score Mapping")
    print("=" * 65)

    # 1. Identical vectors -> cosine 1.0 -> mapped score 1.0
    u = np.zeros(768)
    u[0] = 1.0
    assert abs(matcher.cosine_similarity(u, u) - 1.0) < 1e-6
    assert abs(matcher._map_cosine_to_score(1.0) - 1.0) < 1e-6

    # 2. Orthogonal vectors -> cosine 0.0 -> mapped score 0.0
    v = np.zeros(768)
    v[1] = 1.0
    assert abs(matcher.cosine_similarity(u, v) - 0.0) < 1e-6
    assert abs(matcher._map_cosine_to_score(0.0) - 0.0) < 1e-6

    # 3. Diametrically opposite vectors -> cosine -1.0 -> mapped score clamped to 0.0
    neg_u = -u
    raw_neg = matcher.cosine_similarity(u, neg_u)
    assert abs(raw_neg - (-1.0)) < 1e-6, f"Expected -1.0, got {raw_neg}"
    mapped_neg = matcher._map_cosine_to_score(raw_neg)
    assert mapped_neg == 0.0, f"Opposite vector score must be clamped to 0.0, got {mapped_neg}"

    # 4. Moderate similarity (cosine 0.75 -> mapped score 0.75)
    score_mid = matcher._map_cosine_to_score(0.75)
    assert abs(score_mid - 0.75) < 1e-6

    # 5. Float drift clamping (> 1.0 clipped to 1.0, < -1.0 clipped to -1.0)
    assert matcher.cosine_similarity(u * 1.00000000001, u) <= 1.0
    assert matcher._map_cosine_to_score(1.00005) == 1.0
    assert matcher._map_cosine_to_score(-0.00005) == 0.0

    # 6. Zero vectors defensively return 0.0 without ZeroDivisionError
    zero_vec = np.zeros(768)
    assert matcher.cosine_similarity(zero_vec, u) == 0.0
    assert matcher.cosine_similarity(zero_vec, zero_vec) == 0.0

    print("  [PASSED] Cosine similarity and non-negative score mapping mathematically verified.\n")


# ---------------------------------------------------------------------------
# TEST 3: Multimodal Similarity with Missing & Invalid Embeddings
# ---------------------------------------------------------------------------
def test_multimodal_missing_and_invalid_embeddings():
    """Verify compute_embedding_similarity handles missing or corrupted vectors gracefully."""
    print("=" * 65)
    print("TEST 3: Multimodal Similarity with Missing & Invalid Vectors")
    print("=" * 65)

    v1 = np.zeros(768)
    v1[0] = 1.0
    v2 = np.zeros(768)
    v2[0] = 1.0

    # Valid pair
    score, note = matcher.compute_embedding_similarity(v1, v2)
    assert score is not None and abs(score - 1.0) < 1e-6
    assert "Raw cosine: 1.0000" in note

    # Source missing
    score_no_src, note_src = matcher.compute_embedding_similarity(None, v2)
    assert score_no_src is None
    assert "Source report has no valid embedding" in note_src

    # Candidate missing
    score_no_cand, note_cand = matcher.compute_embedding_similarity(v1, None)
    assert score_no_cand is None
    assert "Candidate report has no valid embedding" in note_cand

    # Invalid dimension vector
    bad_v = np.ones(512)
    score_bad, note_bad = matcher.compute_embedding_similarity(v1, bad_v)
    assert score_bad is None
    assert "Candidate report has no valid embedding" in note_bad

    # NaN in candidate
    nan_v = v1.copy()
    nan_v[5] = np.nan
    score_nan, note_nan = matcher.compute_embedding_similarity(nan_v, v2)
    assert score_nan is None
    assert "Source report has no valid embedding" in note_nan

    print("  [PASSED] Missing/corrupted embeddings handled transparently without crashing.\n")


# ---------------------------------------------------------------------------
# TEST 4: Visual Attribute Matching (Colors, Materials, Brands, Features)
# ---------------------------------------------------------------------------
def test_attribute_overlap_and_matching():
    """Verify color set overlap, material match, brand match, and feature keywords."""
    print("=" * 65)
    print("TEST 4: Visual Attribute Overlap & Substring Matching")
    print("=" * 65)

    attrs_source = {
        "colors": ["black", "silver"],
        "material": "brushed aluminium",
        "brand_or_logo": "Apple",
        "distinctive_features": ["small scratch on left corner", "glow sticker"],
    }

    # 1. Identical attributes
    score_id, details_id = matcher.compare_attributes(attrs_source, attrs_source)
    assert abs(score_id - 1.0) < 1e-5, f"Identical attributes should score 1.0, got {score_id}"
    assert details_id["matches"]["color"]["match"] is True
    assert details_id["matches"]["material"]["match"] is True
    assert details_id["matches"]["brand"]["match"] is True
    assert details_id["matches"]["features"]["match"] is True

    # 2. Material substring match ("aluminium" matches "brushed aluminium")
    attrs_sub_mat = {
        "colors": ["black", "silver"],
        "material": "aluminium",
        "brand_or_logo": "Apple",
        "distinctive_features": ["small scratch on left corner"],
    }
    score_sub, details_sub = matcher.compare_attributes(attrs_source, attrs_sub_mat)
    assert details_sub["matches"]["material"]["score"] == 0.8
    assert score_sub > 0.8

    # 3. Brand substring match ("Apple Inc" matches "Apple")
    attrs_sub_brand = {
        "colors": ["black", "silver"],
        "material": "brushed aluminium",
        "brand_or_logo": "Apple Inc",
        "distinctive_features": ["small scratch on left corner"],
    }
    score_b, details_b = matcher.compare_attributes(attrs_source, attrs_sub_brand)
    assert details_b["matches"]["brand"]["score"] == 0.8

    # 4. Distinctive features keyword overlap with stopwords removed
    attrs_feat = {
        "colors": ["black", "silver"],
        "material": "brushed aluminium",
        "brand_or_logo": "Apple",
        "distinctive_features": ["corner scratch"],  # "scratch" and "corner" match
    }
    score_f, details_f = matcher.compare_attributes(attrs_source, attrs_feat)
    common_tokens = details_f["matches"]["features"]["common_tokens"]
    assert "corner" in common_tokens and "scratch" in common_tokens

    # 5. Completely disjoint attributes
    attrs_disjoint = {
        "colors": ["red", "yellow"],
        "material": "leather",
        "brand_or_logo": "Samsung",
        "distinctive_features": ["floral embroidery"],
    }
    score_disjoint, _ = matcher.compare_attributes(attrs_source, attrs_disjoint)
    assert score_disjoint == 0.0, f"Disjoint attributes must score 0.0, got {score_disjoint}"

    print("  [PASSED] Visual attribute matching for colors, materials, brands, and features verified.\n")


# ---------------------------------------------------------------------------
# TEST 5: Missing & Unknown Attribute Handling
# ---------------------------------------------------------------------------
def test_missing_and_unknown_attributes():
    """Verify unknown or missing attributes are omitted from denominator without penalty."""
    print("=" * 65)
    print("TEST 5: Non-Penalizing Missing & Unknown Attributes")
    print("=" * 65)

    # Source has known color and known brand
    attrs_src = {
        "colors": ["black"],
        "brand_or_logo": "Sony",
        "material": "unknown",
        "distinctive_features": "none",
    }

    # Candidate has matching color, but brand is unknown
    attrs_cand = {
        "colors": ["black"],
        "brand_or_logo": "unknown",
        "material": "unknown",
        "distinctive_features": "unknown",
    }

    score, details = matcher.compare_attributes(attrs_src, attrs_cand)

    # Color matches perfectly (3.0 * 1.0 = 3.0). Brand is unknown on candidate,
    # material is unknown on both, features are unknown on both.
    # Evaluated weight = 3.0. Final score must be 1.0, NOT penalised!
    assert score is not None
    assert abs(score - 1.0) < 1e-5, f"Unknown brand should not penalize matching color: {score}"
    assert details["matches"]["brand"]["match"] is None
    assert details["evaluated_weight"] == 3.0

    # All attributes unknown on one or both reports
    attrs_all_unknown_1 = {"colors": ["unknown"], "material": "unknown", "brand_or_logo": "n/a"}
    attrs_all_unknown_2 = {"colors": [], "material": None, "brand_or_logo": ""}
    score_none, details_none = matcher.compare_attributes(attrs_all_unknown_1, attrs_all_unknown_2)
    assert score_none is None, "When all attributes are unknown, score must be None"
    assert details_none["available"] is False

    # Empty dictionary or None
    score_empty, _ = matcher.compare_attributes({}, {})
    assert score_empty is None
    score_null, _ = matcher.compare_attributes(None, attrs_src)
    assert score_null is None

    print("  [PASSED] Unknown/missing attributes do not penalize scores and omit weights cleanly.\n")


# ---------------------------------------------------------------------------
# TEST 6: Location Context Token Similarity
# ---------------------------------------------------------------------------
def test_location_token_similarity():
    """Verify campus location token overlap and stopword handling."""
    print("=" * 65)
    print("TEST 6: Location Context Token Similarity")
    print("=" * 65)

    # 1. "Main Library" vs "Library, Second Floor"
    # "floor" is in stop words. "library" matches.
    loc1 = "Main Library"
    loc2 = "Library, Second Floor"
    score_lib, summary_lib = matcher.compare_location(loc1, loc2)
    assert score_lib is not None and score_lib > 0.0
    assert "library" in summary_lib.lower()

    # 2. Campus room stopword filtering
    # "The Hall near Room 101" vs "Room 101 Gate" -> tokens "101" match
    loc_rm1 = "The Hall near Room 101"
    loc_rm2 = "Room 101 Gate"
    score_rm, summary_rm = matcher.compare_location(loc_rm1, loc_rm2)
    assert score_rm is not None and score_rm > 0.0
    assert "101" in summary_rm

    # 3. Disjoint campus locations
    loc_sci = "North Science Complex"
    loc_caf = "South Cafeteria"
    score_diff, summary_diff = matcher.compare_location(loc_sci, loc_caf)
    assert score_diff == 0.0
    assert "Different locations" in summary_diff

    # 4. Empty, None, or whitespace location
    assert matcher.compare_location("", "Library")[0] is None
    assert matcher.compare_location(None, "Library")[0] is None
    assert matcher.compare_location("   ", "   ")[0] is None
    assert matcher.compare_location("unknown", "Library")[0] is None

    print("  [PASSED] Campus location tokenization and stopword removal verified.\n")


# ---------------------------------------------------------------------------
# TEST 7: Weighted Scoring & Dynamic Renormalization
# ---------------------------------------------------------------------------
def test_weighted_scoring_and_renormalization():
    """Verify 65/25/10 weights and dynamic renormalization when components are unavailable."""
    print("=" * 65)
    print("TEST 7: Weighted Scoring & Dynamic Weight Renormalization")
    print("=" * 65)

    # Scenario 1: All three components present
    # Base: Embedding 0.8, Attribute 0.6, Location 0.4
    # Expected: 0.65*0.8 + 0.25*0.6 + 0.10*0.4 = 0.52 + 0.15 + 0.04 = 0.71
    score_all, weights_all = matcher.compute_composite_score(0.8, 0.6, 0.4)
    expected_all = WEIGHT_EMBEDDING * 0.8 + WEIGHT_ATTRIBUTE * 0.6 + WEIGHT_LOCATION * 0.4
    assert abs(score_all - expected_all) < 1e-6
    assert abs(weights_all["embedding"] - 0.65) < 1e-6
    assert abs(weights_all["attribute"] - 0.25) < 1e-6
    assert abs(weights_all["location"] - 0.10) < 1e-6

    # Scenario 2: Attribute unavailable (None) - e.g. quota limit or no image
    # Remaining available weights: 0.65 + 0.10 = 0.75
    # Renormalized: embedding = 0.65/0.75 = 0.8667, location = 0.10/0.75 = 0.1333
    score_no_attr, weights_no_attr = matcher.compute_composite_score(0.8, None, 0.4)
    expected_no_attr = (0.65 / 0.75) * 0.8 + (0.10 / 0.75) * 0.4
    assert abs(score_no_attr - expected_no_attr) < 1e-6
    assert abs(sum(weights_no_attr.values()) - 1.0) < 1e-6
    assert weights_no_attr["attribute"] == 0.0

    # Scenario 3: Attribute and Location both unavailable (Only Embedding)
    score_only_emb, weights_only_emb = matcher.compute_composite_score(0.8, None, None)
    assert abs(score_only_emb - 0.8) < 1e-6
    assert weights_only_emb["embedding"] == 1.0
    assert weights_only_emb["attribute"] == 0.0
    assert weights_only_emb["location"] == 0.0

    # Scenario 4: Embedding unavailable (None), only attribute & location present
    score_no_emb, weights_no_emb = matcher.compute_composite_score(None, 0.6, 0.4)
    expected_no_emb = (0.25 / 0.35) * 0.6 + (0.10 / 0.35) * 0.4
    assert abs(score_no_emb - expected_no_emb) < 1e-6
    assert abs(sum(weights_no_emb.values()) - 1.0) < 1e-6

    # Scenario 5: All components None
    score_none, weights_none = matcher.compute_composite_score(None, None, None)
    assert score_none == 0.0
    assert sum(weights_none.values()) == 0.0

    print("  [PASSED] Dynamic weight renormalization guarantees scores always sum to 1.0.\n")


# ---------------------------------------------------------------------------
# TEST 8: Candidate Eligibility Filtering
# ---------------------------------------------------------------------------
def test_candidate_eligibility_filtering():
    """Verify strict category, opposite type, active status, and self-exclusion filters."""
    print("=" * 65)
    print("TEST 8: Candidate Eligibility Filtering (Category, Type, Status)")
    print("=" * 65)

    setup_test_db()
    try:
        # Deterministic embedding vector
        np.random.seed(101)
        v_base = np.random.randn(768).astype(np.float32)
        v_base /= np.linalg.norm(v_base)

        # 1. Source report: lost, Electronics, active
        source_id = database.create_report(
            report_type="lost",
            title="Lost iPhone 14 Pro",
            description="Deep purple iPhone 14 Pro with clear MagSafe case",
            category="Electronics",
            location="Main Library 2nd Floor",
            ai_attributes={"colors": ["purple"], "brand_or_logo": "Apple"},
            embedding=v_base,
        )

        # 2. Eligible candidate: found, Electronics, active
        cand_eligible_id = database.create_report(
            report_type="found",
            title="Found Purple iPhone",
            description="Purple smartphone found at study desk",
            category="Electronics",
            location="Library 2nd Floor",
            ai_attributes={"colors": ["purple"], "brand_or_logo": "Apple"},
            embedding=v_base,
        )

        # 3. Disqualified: Same type (lost -> cannot match another lost report)
        cand_same_type_id = database.create_report(
            report_type="lost",
            title="Another Lost iPhone",
            description="Lost purple iPhone",
            category="Electronics",
            location="Library 2nd Floor",
            ai_attributes={"colors": ["purple"], "brand_or_logo": "Apple"},
            embedding=v_base,
        )

        # 4. Disqualified: Different category (Bags & Wallets)
        cand_diff_cat_id = database.create_report(
            report_type="found",
            title="Found Purple Sleeve",
            description="Purple sleeve case",
            category="Bags & Wallets",
            location="Library 2nd Floor",
            ai_attributes={"colors": ["purple"]},
            embedding=v_base,
        )

        # 5. Disqualified: Matched / Resolved status (Inactive)
        cand_matched_id = database.create_report(
            report_type="found",
            title="Previously Matched Phone",
            description="Already returned iPhone",
            category="Electronics",
            location="Library 2nd Floor",
            ai_attributes={"colors": ["purple"], "brand_or_logo": "Apple"},
            embedding=v_base,
        )
        database.update_report_status(cand_matched_id, "matched")

        # Run candidate matching
        matches = matcher.find_matches(source_id, threshold=0.10)
        matched_ids = [m.report["id"] for m in matches]

        # Valid candidate must be present
        assert cand_eligible_id in matched_ids, "Eligible candidate must be found"

        # Disqualified candidates must NOT be present
        assert source_id not in matched_ids, "Source report must never match against itself (self-exclusion)"
        assert cand_same_type_id not in matched_ids, "Same report type (lost ↔ lost) must be excluded"
        assert cand_diff_cat_id not in matched_ids, "Different category must be strictly excluded"
        assert cand_matched_id not in matched_ids, "Non-active report must be excluded"

        # Inactive source report test: if source is resolved, returns empty list
        database.update_report_status(source_id, "resolved")
        inactive_source_matches = matcher.find_matches(source_id)
        assert len(inactive_source_matches) == 0, "Inactive source report must return 0 matches"

        print("  [PASSED] Candidate eligibility rigorously enforced across all criteria.\n")

    finally:
        teardown_test_db()


# ---------------------------------------------------------------------------
# TEST 9: Candidate Ranking & Limit Enforcement
# ---------------------------------------------------------------------------
def test_candidate_ranking_and_limit():
    """Verify candidates are returned in strictly descending score order and respect limit."""
    print("=" * 65)
    print("TEST 9: Candidate Ranking & Limit Enforcement")
    print("=" * 65)

    setup_test_db()
    try:
        np.random.seed(202)
        v_base = np.random.randn(768).astype(np.float32)
        v_base /= np.linalg.norm(v_base)

        source_id = database.create_report(
            report_type="lost",
            title="Lost ThinkPad Laptop",
            description="Black Lenovo ThinkPad laptop with red trackpoint",
            category="Electronics",
            location="Computer Lab 3",
            ai_attributes={"colors": ["black"], "brand_or_logo": "Lenovo"},
            embedding=v_base,
        )

        # High match candidate (almost identical vector + matching attributes + matching location)
        v_high = v_base + np.random.randn(768).astype(np.float32) * 0.01
        v_high /= np.linalg.norm(v_high)
        c_high_id = database.create_report(
            report_type="found",
            title="Found ThinkPad in Lab",
            description="Black ThinkPad laptop found on desk in Computer Lab 3",
            category="Electronics",
            location="Computer Lab 3",
            ai_attributes={"colors": ["black"], "brand_or_logo": "Lenovo"},
            embedding=v_high,
        )

        # Medium match candidate (lower vector similarity + partial attributes)
        v_med = v_base + np.random.randn(768).astype(np.float32) * 0.70
        v_med /= np.linalg.norm(v_med)
        c_med_id = database.create_report(
            report_type="found",
            title="Found Laptop in Campus Center",
            description="Black laptop found in campus center",
            category="Electronics",
            location="Campus Center",
            ai_attributes={"colors": ["black"], "brand_or_logo": "unknown"},
            embedding=v_med,
        )

        # Low match candidate (unrelated vector + different brand + different location)
        v_low = np.random.randn(768).astype(np.float32)
        v_low /= np.linalg.norm(v_low)
        c_low_id = database.create_report(
            report_type="found",
            title="Found Asus Laptop",
            description="Silver Asus laptop found near sports center",
            category="Electronics",
            location="Sports Complex",
            ai_attributes={"colors": ["silver"], "brand_or_logo": "Asus"},
            embedding=v_low,
        )

        # Find matches with no threshold pruning
        matches = matcher.find_matches(source_id, threshold=0.0, limit=10)
        assert len(matches) == 3, f"Expected 3 matches, got {len(matches)}"

        # Verify descending score order
        scores = [m.final_score for m in matches]
        assert scores == sorted(scores, reverse=True), f"Matches must be in descending score order: {scores}"
        assert matches[0].report["id"] == c_high_id, "Highest match should be ranked #1"

        # Verify limit enforcement
        capped_matches = matcher.find_matches(source_id, threshold=0.0, limit=2)
        assert len(capped_matches) == 2, f"Limit 2 must return exactly 2 matches, got {len(capped_matches)}"
        assert capped_matches[0].report["id"] == c_high_id

        print(f"  [PASSED] Candidates correctly ranked: {scores[0]:.2%} > {scores[1]:.2%} > {scores[2]:.2%}")
        print("  [PASSED] Limit parameter strictly enforced.\n")

    finally:
        teardown_test_db()


# ---------------------------------------------------------------------------
# TEST 10: Threshold Pruning & No-Match Scenarios
# ---------------------------------------------------------------------------
def test_threshold_pruning_and_no_match():
    """Verify threshold pruning and empty results when no eligible candidates exist."""
    print("=" * 65)
    print("TEST 10: Threshold Pruning & No-Match Scenarios")
    print("=" * 65)

    setup_test_db()
    try:
        np.random.seed(303)
        v_base = np.random.randn(768).astype(np.float32)
        v_base /= np.linalg.norm(v_base)

        source_id = database.create_report(
            report_type="lost",
            title="Lost Calculator",
            description="TI-84 graphic calculator",
            category="Electronics",
            location="Math Building",
            ai_attributes={"colors": ["black"], "brand_or_logo": "Texas Instruments"},
            embedding=v_base,
        )

        # 1. No other reports in database -> returns empty list
        empty_matches = matcher.find_matches(source_id)
        assert empty_matches == [], "Should return empty list when no candidates exist"

        # 2. Candidate below threshold
        v_unrelated = np.random.randn(768).astype(np.float32)
        v_unrelated /= np.linalg.norm(v_unrelated)
        database.create_report(
            report_type="found",
            title="Found White Earbuds",
            description="White wireless earbuds",
            category="Electronics",
            location="Gymnasium",
            ai_attributes={"colors": ["white"], "brand_or_logo": "Sony"},
            embedding=v_unrelated,
        )

        # With a high threshold (e.g. 0.85), unrelated report must be pruned
        high_thresh_matches = matcher.find_matches(source_id, threshold=0.85)
        assert len(high_thresh_matches) == 0, "Candidate below threshold must be pruned"

        # 3. Non-existent report ID
        assert matcher.find_matches(999999) == []

        print("  [PASSED] Threshold filtering and no-match scenarios return clean empty lists.\n")

    finally:
        teardown_test_db()


# ---------------------------------------------------------------------------
# TEST 11: Grounded Match Explanations & Ownership Disclaimer
# ---------------------------------------------------------------------------
def test_grounded_match_explanations():
    """Verify explanations are grounded, include component scores, and state similarity not ownership."""
    print("=" * 65)
    print("TEST 11: Grounded Match Explanations & Ownership Disclaimer")
    print("=" * 65)

    explanation = matcher.build_match_explanation(
        final_score=0.84,
        embedding_score=0.88,
        attribute_score=0.75,
        location_score=0.50,
        effective_weights={"embedding": 0.65, "attribute": 0.25, "location": 0.10},
        attr_details={
            "matches": {
                "color": {"match": True, "common": ["black"]},
                "material": {"match": True, "source": "plastic"},
                "brand": {"match": True, "source": "Dell"},
                "features": {"common_tokens": ["sticker"]},
            }
        },
        loc_summary="Shared location keywords: library",
        source_report={"title": "Lost Laptop"},
        candidate_report={"title": "Found Laptop"},
    )

    # 1. Overall similarity score percentage
    assert "Similarity Score: 84%" in explanation

    # 2. Component scores & effective weights
    assert "Multimodal Similarity (Image + Text): 88% [Weight: 65%]" in explanation
    assert "Visual Attributes: 75% [Weight: 25%]" in explanation
    assert "Location Context: 50% [Weight: 10%]" in explanation

    # 3. Specific attribute details grounded in comparison
    assert "Colors: black" in explanation
    assert "Material: plastic" in explanation
    assert "Brand: Dell" in explanation

    # 4. Mandatory disclaimer: similarity not ownership
    assert "Notice: This score reflects estimated visual and contextual similarity, not confirmed ownership." in explanation
    assert "Physical verification is required before confirming a match." in explanation

    # 5. Never claims identical or confirmed ownership
    assert "identical" not in explanation.lower()
    assert "ownership probability" not in explanation.lower()

    print("  [PASSED] Grounded explanation with component breakdown and ownership disclaimer verified.\n")


# ---------------------------------------------------------------------------
# TEST 12: Stored Match Deduplication
# ---------------------------------------------------------------------------
def test_stored_match_deduplication():
    """Verify find_and_store_matches prevents duplicate match rows in the database."""
    print("=" * 65)
    print("TEST 12: Stored Match Deduplication")
    print("=" * 65)

    setup_test_db()
    try:
        np.random.seed(404)
        v_base = np.random.randn(768).astype(np.float32)
        v_base /= np.linalg.norm(v_base)

        lost_id = database.create_report(
            report_type="lost",
            title="Lost Hydro Flask",
            description="Blue Hydro Flask water bottle",
            category="Other",
            location="Gymnasium",
            embedding=v_base,
        )

        found_id = database.create_report(
            report_type="found",
            title="Found Water Bottle",
            description="Blue bottle found on gym bleachers",
            category="Other",
            location="Gymnasium",
            embedding=v_base,
        )

        # First run: stores the match
        results1 = matcher.find_and_store_matches(lost_id, threshold=0.10)
        assert len(results1) == 1

        matches_in_db_1 = database.get_matches_for_report(lost_id)
        assert len(matches_in_db_1) == 1

        # Second run: should NOT insert duplicate row in matches table
        results2 = matcher.find_and_store_matches(lost_id, threshold=0.10)
        matches_in_db_2 = database.get_matches_for_report(lost_id)
        assert len(matches_in_db_2) == 1, "Duplicate match pair must not be inserted"

        print("  [PASSED] Duplicate candidate pair insertion prevented in database.\n")

    finally:
        teardown_test_db()


# ---------------------------------------------------------------------------
# Runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n" + "=" * 65)
    print("FINDR — MILESTONE 3: MATCHING ENGINE TEST SUITE")
    print("=" * 65 + "\n")

    test_suite = [
        ("Vector Validation & Numerical Edge Cases", test_vector_validation_and_edge_cases),
        ("Cosine Similarity & Bounded Score Mapping", test_cosine_similarity_and_score_mapping),
        ("Multimodal Similarity with Missing Vectors", test_multimodal_missing_and_invalid_embeddings),
        ("Visual Attribute Overlap & Substrings", test_attribute_overlap_and_matching),
        ("Missing & Unknown Attribute Handling", test_missing_and_unknown_attributes),
        ("Location Context Token Similarity", test_location_token_similarity),
        ("Weighted Scoring & Dynamic Renormalization", test_weighted_scoring_and_renormalization),
        ("Candidate Eligibility Filtering", test_candidate_eligibility_filtering),
        ("Candidate Ranking & Limit Enforcement", test_candidate_ranking_and_limit),
        ("Threshold Pruning & No-Match Scenarios", test_threshold_pruning_and_no_match),
        ("Grounded Match Explanations & Disclaimer", test_grounded_match_explanations),
        ("Stored Match Deduplication", test_stored_match_deduplication),
    ]

    passed_count = 0
    failed_count = 0

    for name, func in test_suite:
        try:
            func()
            passed_count += 1
        except Exception as e:
            print(f"  [FAILED] {name} failed: {e}\n")
            import traceback
            traceback.print_exc()
            failed_count += 1

    print("=" * 65)
    print("MILESTONE 3 TEST SUMMARY")
    print("=" * 65)
    print(f"  Passed:  {passed_count} / {len(test_suite)} (100% Offline Unit Tests)")
    print(f"  Failed:  {failed_count}")
    print("=" * 65 + "\n")

    sys.exit(0 if failed_count == 0 else 1)
