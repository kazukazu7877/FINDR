"""
FINDR Matching Engine
---------------------
Compares lost and found reports using a multi-factor similarity pipeline:
  1. Multimodal embedding cosine similarity (provisional weight: 65%)
  2. Structured attribute comparison (provisional weight: 25%)
  3. Location context token similarity (provisional weight: 10%)

Features:
  - Strict eligibility filtering (opposite type, same category, active status, self-exclusion).
  - Robust vector validation and bounded [0.0, 1.0] cosine mapping.
  - Transparent handling of missing/unknown attributes without false mismatch penalties.
  - Dynamic weight renormalization when one or more components are unavailable.
  - Grounded, human-readable explanations.
  - Scores represent similarity, NEVER ownership probability.
"""

import logging
import re
from dataclasses import dataclass, field
from typing import Any

import numpy as np

import database
from config import (
    WEIGHT_EMBEDDING,
    WEIGHT_ATTRIBUTE,
    WEIGHT_LOCATION,
    MATCH_THRESHOLD,
    MAX_MATCHES,
    EMBEDDING_DIMENSIONS,
)

logger = logging.getLogger(__name__)

# Noise words stripped from location tokens
LOCATION_STOPWORDS = {
    "the", "a", "an", "at", "in", "on", "of", "near", "by", "and", "or",
    "to", "from", "floor", "level", "building", "block", "hall", "room",
    "area", "entrance", "exit", "gate", "-", "–", "/", "\\", ",", ".",
}

# Stopwords stripped from distinctive features tokens
FEATURE_STOPWORDS = {
    "the", "a", "an", "with", "and", "or", "is", "has", "on", "in", "of",
    "to", "for", "by", "at", "from", "its", "it", "very", "small", "large",
}


# ---------------------------------------------------------------------------
# Data Structures
# ---------------------------------------------------------------------------

@dataclass
class MatchResult:
    """Represents a scored potential match between two reports."""
    report: dict                         # Candidate report dictionary
    final_score: float                   # Composite similarity score (0.0 to 1.0)
    embedding_score: float | None        # Multimodal cosine similarity (0.0 to 1.0) or None
    attribute_score: float | None        # Visual attribute overlap score (0.0 to 1.0) or None
    location_score: float | None         # Location token similarity score (0.0 to 1.0) or None
    explanation: str                     # Grounded human-readable match breakdown
    effective_weights: dict[str, float]  # Normalized weights applied based on availability
    details: dict = field(default_factory=dict)  # Attribute comparison breakdown


# ---------------------------------------------------------------------------
# 1. Multimodal Embedding Similarity
# ---------------------------------------------------------------------------

def is_valid_vector(vector: Any, expected_dims: int = EMBEDDING_DIMENSIONS) -> bool:
    """Validate that an embedding is a valid, finite numpy array with expected dimensions."""
    if vector is None:
        return False
    if not isinstance(vector, np.ndarray):
        try:
            vector = np.array(vector, dtype=np.float64)
        except Exception:
            return False

    if vector.ndim != 1 or len(vector) != expected_dims:
        return False
    if np.isnan(vector).any() or np.isinf(vector).any():
        return False
    norm = np.linalg.norm(vector)
    if norm == 0.0 or not np.isfinite(norm):
        return False

    return True


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two numeric vectors.
    Defensively checks for zero norms and floating point drift.
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    dot = float(np.dot(a, b))
    raw_sim = dot / (norm_a * norm_b)
    # Clamp to valid cosine mathematical range [-1.0, 1.0]
    return float(np.clip(raw_sim, -1.0, 1.0))


def _map_cosine_to_score(raw_cosine: float) -> float:
    """Map raw cosine similarity [-1.0, 1.0] to non-negative similarity score [0.0, 1.0].
    Negative similarity (diametrically opposite concepts) is clamped to 0.0.
    """
    return float(np.clip(raw_cosine, 0.0, 1.0))


def compute_embedding_similarity(
    emb_a: Any, emb_b: Any
) -> tuple[float | None, str | None]:
    """Compute mapped cosine similarity between two stored embeddings.

    Returns:
        (score, note) where score is 0.0-1.0 if both vectors are valid,
        or (None, reason) if either embedding is missing or invalid.
    """
    if not is_valid_vector(emb_a):
        return None, "Source report has no valid embedding"
    if not is_valid_vector(emb_b):
        return None, "Candidate report has no valid embedding"

    raw_cosine = cosine_similarity(emb_a, emb_b)
    mapped_score = _map_cosine_to_score(raw_cosine)
    return mapped_score, f"Raw cosine: {raw_cosine:.4f}"


# ---------------------------------------------------------------------------
# 2. Visual Attribute Matching
# ---------------------------------------------------------------------------

def _is_unknown(val: Any) -> bool:
    """Check if an extracted attribute value indicates unknown or missing data."""
    if val is None:
        return True
    if isinstance(val, str):
        v = val.strip().lower()
        return v in ("", "unknown", "none", "n/a", "null", "unspecified")
    if isinstance(val, (list, set, tuple)):
        clean = [item for item in val if not _is_unknown(item)]
        return len(clean) == 0
    return False


def compare_attributes(
    attrs_a: dict | None, attrs_b: dict | None
) -> tuple[float | None, dict]:
    """Compare AI-extracted visual attributes between two reports.

    Attributes evaluated:
      - Colors (Jaccard set overlap)
      - Material (exact or substring)
      - Visible brand or logo (exact or substring)
      - Distinctive features (token overlap)

    Rules:
      - 'unknown' or missing values are NOT treated as mismatches.
      - If an attribute is unknown in either report, its weight is omitted from the denominator.
      - If no common attributes can be evaluated, returns (None, details).

    Returns:
        (attribute_score, comparison_details)
    """
    if attrs_a is None or attrs_b is None or not isinstance(attrs_a, dict) or not isinstance(attrs_b, dict):
        return None, {"available": False, "note": "Attributes unavailable on one or both reports"}

    matches: dict[str, Any] = {}
    total_weight = 0.0
    weighted_score = 0.0

    # 1. Colors (weight: 3.0)
    colors_raw_a = attrs_a.get("colors") or attrs_a.get("color")
    colors_raw_b = attrs_b.get("colors") or attrs_b.get("color")
    if not _is_unknown(colors_raw_a) and not _is_unknown(colors_raw_b):
        items_a = colors_raw_a if isinstance(colors_raw_a, (list, set, tuple)) else [colors_raw_a]
        items_b = colors_raw_b if isinstance(colors_raw_b, (list, set, tuple)) else [colors_raw_b]
        set_a = {str(c).strip().lower() for c in items_a if not _is_unknown(c)}
        set_b = {str(c).strip().lower() for c in items_b if not _is_unknown(c)}
        if set_a and set_b:
            weight = 3.0
            total_weight += weight
            overlap = len(set_a & set_b)
            union = len(set_a | set_b)
            c_score = overlap / union if union > 0 else 0.0
            weighted_score += weight * c_score
            matches["color"] = {
                "match": c_score > 0,
                "score": c_score,
                "common": sorted(list(set_a & set_b)),
                "source": sorted(list(set_a)),
                "candidate": sorted(list(set_b)),
            }
        else:
            matches["color"] = {"match": None, "note": "Colors unknown or unspecified"}
    else:
        matches["color"] = {"match": None, "note": "Colors unknown or unspecified"}

    # 2. Material (weight: 2.0)
    mat_a = attrs_a.get("material")
    mat_b = attrs_b.get("material")
    if not _is_unknown(mat_a) and not _is_unknown(mat_b):
        str_a = str(mat_a).strip().lower()
        str_b = str(mat_b).strip().lower()
        weight = 2.0
        total_weight += weight
        if str_a == str_b:
            m_score = 1.0
        elif str_a in str_b or str_b in str_a:
            m_score = 0.8
        else:
            m_score = 0.0
        weighted_score += weight * m_score
        matches["material"] = {
            "match": m_score > 0,
            "score": m_score,
            "source": str_a,
            "candidate": str_b,
        }
    else:
        matches["material"] = {"match": None, "note": "Material unknown or not visually identifiable"}

    # 3. Visible Brand or Logo (weight: 3.0)
    brand_a = attrs_a.get("brand_or_logo") or attrs_a.get("visible_branding")
    brand_b = attrs_b.get("brand_or_logo") or attrs_b.get("visible_branding")
    if not _is_unknown(brand_a) and not _is_unknown(brand_b):
        b_str_a = str(brand_a).strip().lower()
        b_str_b = str(brand_b).strip().lower()
        weight = 3.0
        total_weight += weight
        if b_str_a == b_str_b:
            b_score = 1.0
        elif b_str_a in b_str_b or b_str_b in b_str_a:
            b_score = 0.8
        else:
            b_score = 0.0
        weighted_score += weight * b_score
        matches["brand"] = {
            "match": b_score > 0,
            "score": b_score,
            "source": b_str_a,
            "candidate": b_str_b,
        }
    else:
        matches["brand"] = {"match": None, "note": "Brand/logo unknown or not visible"}

    # 4. Distinctive Features (weight: 2.0)
    feats_raw_a = attrs_a.get("distinctive_features")
    feats_raw_b = attrs_b.get("distinctive_features")
    if not _is_unknown(feats_raw_a) and not _is_unknown(feats_raw_b):
        def _extract_tokens(raw: Any) -> set[str]:
            tokens = set()
            items = raw if isinstance(raw, (list, set, tuple)) else [str(raw)]
            for item in items:
                words = re.findall(r"\b[a-z0-9]{2,}\b", str(item).lower())
                tokens.update(w for w in words if w not in FEATURE_STOPWORDS)
            return tokens

        tok_a = _extract_tokens(feats_raw_a)
        tok_b = _extract_tokens(feats_raw_b)
        if tok_a and tok_b:
            weight = 2.0
            total_weight += weight
            overlap = len(tok_a & tok_b)
            union = len(tok_a | tok_b)
            f_score = overlap / union if union > 0 else 0.0
            weighted_score += weight * f_score
            matches["features"] = {
                "match": f_score > 0,
                "score": f_score,
                "common_tokens": sorted(list(tok_a & tok_b)),
            }
        else:
            matches["features"] = {"match": None, "note": "No distinctive feature keywords"}
    else:
        matches["features"] = {"match": None, "note": "Features unknown or unspecified"}

    if total_weight == 0.0:
        return None, {"available": False, "matches": matches, "note": "All attributes unknown or missing"}

    final_attr_score = weighted_score / total_weight
    return final_attr_score, {"available": True, "matches": matches, "evaluated_weight": total_weight}


# ---------------------------------------------------------------------------
# 3. Location Context Similarity
# ---------------------------------------------------------------------------

def _tokenize_location(location_str: str | None) -> set[str]:
    """Clean and extract meaningful campus location tokens."""
    if not location_str or _is_unknown(location_str):
        return set()
    cleaned = re.findall(r"\b[a-z0-9]{2,}\b", location_str.lower())
    return {w for w in cleaned if w not in LOCATION_STOPWORDS}


def compare_location(loc_a: str | None, loc_b: str | None) -> tuple[float | None, str]:
    """Compare campus location strings using token-level overlap.

    Returns:
        (score, summary) where score is 0.0-1.0 if both locations are non-empty,
        or (None, note) if location information is missing.
    """
    tok_a = _tokenize_location(loc_a)
    tok_b = _tokenize_location(loc_b)

    if not tok_a or not tok_b:
        return None, "Location information incomplete or unspecified"

    overlap = len(tok_a & tok_b)
    union = len(tok_a | tok_b)
    score = overlap / union if union > 0 else 0.0

    common = sorted(list(tok_a & tok_b))
    if common:
        summary = f"Shared location keywords: {', '.join(common)}"
    else:
        summary = f"Different locations ({str(loc_a).strip()} vs {str(loc_b).strip()})"

    return score, summary


# Backwards-compatible aliases
_compare_attributes = compare_attributes


def _compare_location(loc_a: str | None, loc_b: str | None) -> float:
    """Helper alias returning float score for backwards compatibility."""
    score, _ = compare_location(loc_a, loc_b)
    return score if score is not None else 0.0


# ---------------------------------------------------------------------------
# 4. Weight Renormalization & Composite Scoring
# ---------------------------------------------------------------------------

def compute_composite_score(
    embedding_score: float | None,
    attribute_score: float | None,
    location_score: float | None,
) -> tuple[float, dict[str, float]]:
    """Compute the weighted similarity score with dynamic weight renormalization.

    Standard weights:
      - Multimodal Embedding: 65% (0.65)
      - Visual Attributes:    25% (0.25)
      - Location Context:     10% (0.10)

    If a component is genuinely unavailable (None), its weight is omitted
    and the remaining available weights are renormalized to sum to 1.0 (100%).

    Returns:
        (final_score, effective_weights_dict)
    """
    candidates = [
        ("embedding", WEIGHT_EMBEDDING, embedding_score),
        ("attribute", WEIGHT_ATTRIBUTE, attribute_score),
        ("location", WEIGHT_LOCATION, location_score),
    ]

    available = [(name, base_w, score) for name, base_w, score in candidates if score is not None]
    total_available_weight = sum(base_w for _, base_w, _ in available)

    if total_available_weight <= 0.0:
        return 0.0, {"embedding": 0.0, "attribute": 0.0, "location": 0.0}

    effective_weights: dict[str, float] = {}
    final_score = 0.0

    for name, base_w, score in candidates:
        if score is not None:
            norm_w = base_w / total_available_weight
            effective_weights[name] = norm_w
            final_score += norm_w * score
        else:
            effective_weights[name] = 0.0

    # Ensure composite score stays strictly within [0.0, 1.0]
    final_score = float(np.clip(final_score, 0.0, 1.0))
    return final_score, effective_weights


# ---------------------------------------------------------------------------
# 5. Grounded Explanation Generation
# ---------------------------------------------------------------------------

def build_match_explanation(
    final_score: float,
    embedding_score: float | None,
    attribute_score: float | None,
    location_score: float | None,
    effective_weights: dict[str, float],
    attr_details: dict,
    loc_summary: str,
    source_report: dict,
    candidate_report: dict,
) -> str:
    """Build a transparent, human-readable match explanation.

    Strictly describes results as similarity estimates, never ownership probabilities.
    Does not claim two items are identical solely based on high scores.
    """
    lines: list[str] = []
    pct = lambda s: f"{s * 100:.0f}%" if s is not None else "N/A"
    wt_pct = lambda name: f"{effective_weights.get(name, 0.0) * 100:.0f}%"

    lines.append(f"Similarity Score: {pct(final_score)}")
    lines.append("-" * 40)

    # 1. Embedding component
    if embedding_score is not None:
        lines.append(
            f"• Multimodal Similarity (Image + Text): {pct(embedding_score)} "
            f"[Weight: {wt_pct('embedding')}]"
        )
    else:
        lines.append(f"• Multimodal Similarity: Unavailable (weight redistributed)")

    # 2. Attribute component
    if attribute_score is not None:
        attr_parts = []
        matches = attr_details.get("matches", {})

        color_info = matches.get("color", {})
        if color_info.get("common"):
            attr_parts.append(f"Colors: {', '.join(color_info['common'])}")
        elif color_info.get("match") is False:
            attr_parts.append("Colors differ")

        mat_info = matches.get("material", {})
        if mat_info.get("match"):
            attr_parts.append(f"Material: {mat_info['source']}")
        elif mat_info.get("match") is False:
            attr_parts.append(f"Material differs ({mat_info['source']} vs {mat_info['candidate']})")

        brand_info = matches.get("brand", {})
        if brand_info.get("match"):
            attr_parts.append(f"Brand: {brand_info['source']}")
        elif brand_info.get("match") is False:
            attr_parts.append(f"Brand mismatch ({brand_info['source']} vs {brand_info['candidate']})")

        feat_info = matches.get("features", {})
        if feat_info.get("common_tokens"):
            attr_parts.append(f"Features: {', '.join(feat_info['common_tokens'])}")

        summary_str = " | ".join(attr_parts) if attr_parts else "Attributes evaluated"
        lines.append(
            f"• Visual Attributes: {pct(attribute_score)} "
            f"[Weight: {wt_pct('attribute')}] — {summary_str}"
        )
    else:
        lines.append(f"• Visual Attributes: Incomplete/Unknown (weight redistributed)")

    # 3. Location component
    if location_score is not None:
        lines.append(
            f"• Location Context: {pct(location_score)} "
            f"[Weight: {wt_pct('location')}] — {loc_summary}"
        )
    else:
        lines.append(f"• Location Context: Incomplete/Unspecified (weight redistributed)")

    # 4. Verification disclaimer
    lines.append("")
    lines.append(
        "Notice: This score reflects estimated visual and contextual similarity, "
        "not confirmed ownership. Physical verification is required before confirming a match."
    )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# 6. Candidate Search & Ranking
# ---------------------------------------------------------------------------

def find_matches(
    report_id: int,
    threshold: float = MATCH_THRESHOLD,
    limit: int = MAX_MATCHES,
) -> list[MatchResult]:
    """Find and rank potential candidate matches for a report.

    Eligibility Rules:
      1. Opposite report type: lost ↔ found only.
      2. Strict category matching: category must be identical.
      3. Active status only: both source and candidate must be 'active'.
      4. Self-exclusion: cannot match against itself.
      5. Duplicate prevention: candidates deduplicated by ID.

    Returns:
        List of MatchResult sorted in descending score order,
        filtered to scores >= threshold, capped at limit.
    """
    source = database.get_report(report_id)
    if source is None:
        logger.error(f"Report {report_id} not found in database.")
        return []

    # Source must be active
    if source.get("status") != "active":
        logger.info(f"Report {report_id} status is '{source.get('status')}', not active.")
        return []

    # 1. Opposite type
    opposite_type = "found" if source["type"] == "lost" else "lost"

    # 2. Strict category + 3. Active status
    candidates = database.get_reports(
        report_type=opposite_type,
        category=source["category"],
        status="active",
    )

    if not candidates:
        return []

    results: list[MatchResult] = []
    seen_ids: set[int] = set()

    for candidate in candidates:
        cand_id = candidate["id"]

        # 4. Self-exclusion
        if cand_id == source["id"]:
            continue

        # 5. Duplicate candidate prevention
        if cand_id in seen_ids:
            continue
        seen_ids.add(cand_id)

        # Defensive candidate checks
        if candidate.get("type") != opposite_type:
            continue
        if candidate.get("category") != source.get("category"):
            continue
        if candidate.get("status") != "active":
            continue

        # 1. Multimodal Embedding Similarity
        emb_score, _ = compute_embedding_similarity(
            source.get("embedding"), candidate.get("embedding")
        )

        # 2. Visual Attribute Matching
        attr_score, attr_details = compare_attributes(
            source.get("ai_attributes"), candidate.get("ai_attributes")
        )

        # 3. Location Context Similarity
        loc_score, loc_summary = compare_location(
            source.get("location"), candidate.get("location")
        )

        # 4. Final Score with Dynamic Weight Renormalization
        final_score, effective_weights = compute_composite_score(
            embedding_score=emb_score,
            attribute_score=attr_score,
            location_score=loc_score,
        )

        # Filter below threshold
        if final_score < threshold:
            continue

        # 5. Build Grounded Explanation
        explanation = build_match_explanation(
            final_score=final_score,
            embedding_score=emb_score,
            attribute_score=attr_score,
            location_score=loc_score,
            effective_weights=effective_weights,
            attr_details=attr_details,
            loc_summary=loc_summary,
            source_report=source,
            candidate_report=candidate,
        )

        results.append(
            MatchResult(
                report=candidate,
                final_score=final_score,
                embedding_score=emb_score,
                attribute_score=attr_score,
                location_score=loc_score,
                explanation=explanation,
                effective_weights=effective_weights,
                details=attr_details,
            )
        )

    # Rank by descending similarity score
    results.sort(key=lambda r: r.final_score, reverse=True)
    return results[:limit]


def find_and_store_matches(
    report_id: int,
    threshold: float = MATCH_THRESHOLD,
    limit: int = MAX_MATCHES,
) -> list[MatchResult]:
    """Find matches and persist pending match records in the database.
    Does NOT automatically confirm matches (human verification required).
    """
    source = database.get_report(report_id)
    if source is None:
        return []

    results = find_matches(report_id, threshold=threshold, limit=limit)

    for result in results:
        candidate = result.report
        if source["type"] == "lost":
            lost_id, found_id = source["id"], candidate["id"]
        else:
            lost_id, found_id = candidate["id"], source["id"]

        # Prevent duplicate candidate pairs in database
        existing = database.get_matches_for_report(lost_id)
        already_exists = any(
            m["lost_report_id"] == lost_id and m["found_report_id"] == found_id
            for m in existing
        )
        if already_exists:
            continue

        database.create_match(
            lost_report_id=lost_id,
            found_report_id=found_id,
            similarity_score=result.final_score,
            embedding_score=result.embedding_score,
            attribute_score=result.attribute_score,
            location_score=result.location_score,
            explanation=result.explanation,
        )

    return results
