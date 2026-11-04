"""
FINDR — AI-Powered Lost & Found Platform
=========================================
Main Streamlit application entry point.
Handles persistent navigation, dashboard, report submission, matching, and verification.

Navigation Architecture:
  - `st.session_state["current_page"]` is the SINGLE SOURCE OF TRUTH for page routing.
  - The sidebar radio widget reads from `current_page` via its `index` parameter.
  - The radio's `on_change` callback writes back to `current_page`.
  - Quick-action buttons and header buttons write to `current_page` and call `st.rerun()`.
  - We NEVER write directly to the radio widget's key (`_nav_radio`) after instantiation.
"""

import hmac
import io
import logging
import time
import uuid
from pathlib import Path

import streamlit as st
from PIL import Image

import database
import ai_engine
import matcher
import config
from config import (
    CATEGORIES,
    UPLOADS_DIR,
    MAX_IMAGE_SIZE_MB,
    validate_api_key,
)
from ui_components import (
    apply_theme,
    render_logo,
    render_page_header,
    render_hero,
    render_stat_card,
    render_pipeline_item,
    render_report_card,
    render_match_card,
    render_api_error,
    render_empty_state,
    render_score_badge,
    render_status_badge,
    render_type_badge,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Page Configuration
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="FINDR — AI Lost & Found",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Apply custom dark-purple/violet theme
apply_theme()

# Validate environment configuration (ensures production secrets are configured)
try:
    config.validate_environment_config()
except config.ConfigurationError as e:
    st.error(f"🚨 **Configuration Error**: {e}")
    st.info("Please review your Streamlit Secrets (`secrets.toml`) or environment configuration.")
    st.stop()

# Initialise database on first run
database.init_db()

# ---------------------------------------------------------------------------
# Navigation Constants & Session State
# ---------------------------------------------------------------------------
NAV_PAGES = [
    "📊 Dashboard",
    "🔴 Report Lost Item",
    "🟢 Report Found Item",
    "🔍 Find Matches",
    "🤝 Verification / Review",
    "📋 All Reports",
]

# `current_page` is the SINGLE SOURCE OF TRUTH — initialise once
if "current_page" not in st.session_state or st.session_state["current_page"] not in NAV_PAGES:
    st.session_state["current_page"] = NAV_PAGES[0]

if "staff_authenticated" not in st.session_state:
    st.session_state["staff_authenticated"] = False


def navigate_to(page_name: str):
    """Set the current page and trigger an immediate rerun.
    Only modifies `current_page` — never the radio widget key."""
    if page_name in NAV_PAGES:
        st.session_state["current_page"] = page_name
        st.rerun()


# ---------------------------------------------------------------------------
# Sidebar Navigation
# ---------------------------------------------------------------------------
with st.sidebar:
    render_logo()

    def _on_nav_change():
        """Callback: when the user clicks a radio option, sync to current_page."""
        st.session_state["current_page"] = st.session_state["_nav_radio"]

    # Compute the correct index from current_page (source of truth)
    current_idx = NAV_PAGES.index(st.session_state["current_page"])

    st.radio(
        "Navigation",
        options=NAV_PAGES,
        index=current_idx,
        key="_nav_radio",          # internal key — never written to directly
        on_change=_on_nav_change,
        label_visibility="collapsed",
    )

    st.markdown("---")

    # Exhibition Access Control (separates public demo from protected operations)
    st.markdown("**Exhibition Access**")
    is_staff = st.session_state.get("staff_authenticated", False)
    if is_staff:
        st.markdown(
            '<div style="font-size: 0.83rem; color: #34d399; margin-bottom: 6px;">'
            '● <b>Staff Mode Active</b>'
            '</div>',
            unsafe_allow_html=True,
        )
        if st.button("🔒 Lock Staff Mode", key="btn_lock_staff", use_container_width=True):
            st.session_state["staff_authenticated"] = False
            st.rerun()
    else:
        st.markdown(
            '<div style="font-size: 0.83rem; color: #a78bfa; margin-bottom: 6px;">'
            '○ <b>Visitor / Demo Mode</b>'
            '</div>',
            unsafe_allow_html=True,
        )
        with st.expander("🔑 Staff Access", expanded=False):
            if "auth_lockout_until" not in st.session_state:
                st.session_state["auth_lockout_until"] = 0.0
            if "failed_auth_attempts" not in st.session_state:
                st.session_state["failed_auth_attempts"] = 0

            now = time.time()
            if now < st.session_state["auth_lockout_until"]:
                lockout_remaining = int(st.session_state["auth_lockout_until"] - now)
                st.error(f"⏳ Too many failed attempts. Staff authorization locked for {lockout_remaining}s.")
            else:
                code_input = st.text_input(
                    "Access Passcode",
                    type="password",
                    key="staff_passcode_input",
                    placeholder="Enter private staff code",
                )
                if st.button("Authorize", key="btn_auth_staff", use_container_width=True):
                    configured_code = (config.EXHIBITION_ACCESS_CODE or "").strip()
                    if not configured_code:
                        st.error("Staff authorization is not configured on this deployment.")
                    elif code_input and hmac.compare_digest(
                        code_input.strip().encode("utf-8"),
                        configured_code.encode("utf-8")
                    ):
                        st.session_state["staff_authenticated"] = True
                        st.session_state["failed_auth_attempts"] = 0
                        st.session_state["auth_lockout_until"] = 0.0
                        st.success("Staff access granted.")
                        st.rerun()
                    else:
                        st.session_state["failed_auth_attempts"] += 1
                        remaining_attempts = max(0, 5 - st.session_state["failed_auth_attempts"])
                        if st.session_state["failed_auth_attempts"] >= 5:
                            st.session_state["auth_lockout_until"] = time.time() + 60.0
                            st.session_state["failed_auth_attempts"] = 0
                            st.error("🚨 Too many failed attempts. Staff authorization locked for 60 seconds.")
                            st.rerun()
                        else:
                            st.error(f"Invalid access code. {remaining_attempts} attempt(s) remaining before lockout.")

    st.markdown("---")

    # System Status
    st.markdown("**System Status**")
    if validate_api_key():
        st.markdown(
            '<div style="font-size: 0.83rem; margin-bottom: 6px;">'
            '<span style="color: #34d399;">●</span> <b>Embeddings:</b> '
            '<span style="color: #a78bfa;">gemini-embedding-2</span>'
            '</div>',
            unsafe_allow_html=True,
        )
        st.markdown(
            '<div style="font-size: 0.83rem;">'
            '<span style="color: #fbbf24;">●</span> <b>Vision:</b> '
            '<span style="color: #a78bfa;">gemini-3.8-flash</span>'
            '</div>'
            '<div style="font-size: 0.73rem; color: #7b6f9e; margin-left: 14px;">'
            'Free-tier quota limited'
            '</div>',
            unsafe_allow_html=True,
        )
    else:
        st.markdown(
            '<span style="color: #f87171; font-size: 0.83rem;">● AI Engine Offline</span>',
            unsafe_allow_html=True,
        )
        st.caption("Configure GEMINI_API_KEY in secrets or .env")

    st.markdown("---")
    st.caption("FINDR v1.0 • AI Summit Prototype")


# ---------------------------------------------------------------------------
# Helper: Save Uploaded Image
# ---------------------------------------------------------------------------
def _save_uploaded_image(uploaded_file) -> str | None:
    """Save an uploaded image to persistent storage (Supabase or local) and return its URL/path."""
    if uploaded_file is None:
        return None

    file_bytes = uploaded_file.getvalue()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_IMAGE_SIZE_MB:
        st.error(f"Image too large ({size_mb:.1f} MB). Maximum allowed size is {MAX_IMAGE_SIZE_MB} MB.")
        return None

    import storage
    return storage.save_image(file_bytes, uploaded_file.name)


# ---------------------------------------------------------------------------
# Helper: Process Report with AI
# ---------------------------------------------------------------------------
def _process_with_ai(image_bytes: bytes, description: str) -> tuple[dict | None, object]:
    """Execute AI pipeline: preprocessing, vision extraction, and multimodal embedding."""
    if not validate_api_key():
        st.warning("⚠️ AI features unavailable — API key not configured.")
        return None, None

    try:
        with st.spinner("🤖 Processing with multimodal AI..."):
            ai_attributes, embedding = ai_engine.process_item(
                image_bytes=image_bytes,
                user_description=description,
            )

        # 1. Vision attributes feedback
        if ai_attributes:
            st.success("✅ AI visual analysis completed.")
            with st.expander("🤖 AI-Extracted Visual Attributes", expanded=False):
                cols = st.columns(3)
                with cols[0]:
                    if ai_attributes.get("colors"):
                        st.markdown(f"**Colors:** {', '.join(ai_attributes['colors'])}")
                    if ai_attributes.get("material") and ai_attributes["material"] != "unknown":
                        st.markdown(f"**Material:** {ai_attributes['material']}")
                with cols[1]:
                    if ai_attributes.get("brand_or_logo") and ai_attributes["brand_or_logo"] != "unknown":
                        st.markdown(f"**Brand/Logo:** {ai_attributes['brand_or_logo']}")
                    if ai_attributes.get("condition"):
                        st.markdown(f"**Condition:** {ai_attributes['condition']}")
                with cols[2]:
                    if ai_attributes.get("distinctive_features"):
                        st.markdown(f"**Features:** {', '.join(ai_attributes['distinctive_features'])}")
                if ai_attributes.get("visual_description"):
                    st.markdown(f"*{ai_attributes['visual_description']}*")
        else:
            st.info(
                "ℹ️ **Vision Model Notice**: Gemini 3.8 Flash analysis may be limited by "
                "Google's daily free-tier quota. Your report will be saved with multimodal "
                "embeddings and location matching intact."
            )

        # 2. Embedding feedback
        if embedding is not None:
            st.success(f"✅ Multimodal embedding generated ({len(embedding)} dimensions).")
        else:
            st.warning("⚠️ Embedding unavailable. Report saved for keyword and location matching.")

        return ai_attributes, embedding

    except Exception as e:
        logger.error(f"AI processing error: {e}", exc_info=True)
        st.warning("⚠️ AI service encountered an error. Proceeding with report submission.")
        return None, None


# ---------------------------------------------------------------------------
# Page: Dashboard
# ---------------------------------------------------------------------------
def page_dashboard():
    """Overview dashboard with hero, live stats, pipeline, AI status, and recent reports."""

    render_hero()

    stats = database.get_match_statistics()

    # ── Key Statistics ──
    st.markdown('<div class="findr-section-title">📈 Platform Statistics</div>', unsafe_allow_html=True)

    stat_cols = st.columns(5)
    stat_data = [
        (stats.get("total_lost", 0), "Total Lost", "var(--danger)"),
        (stats.get("total_found", 0), "Total Found", "var(--success)"),
        (stats.get("active_reports", 0), "Active Reports", "var(--info)"),
        (stats.get("matches_pending", 0), "Potential Matches", "var(--warning)"),
        (stats.get("matches_confirmed", 0), "Confirmed Matches", "var(--success)"),
    ]
    for col, (val, label, color) in zip(stat_cols, stat_data):
        with col:
            st.markdown(render_stat_card(val, label, color), unsafe_allow_html=True)

    st.markdown("<br>", unsafe_allow_html=True)

    # ── Quick Actions ──
    st.markdown('<div class="findr-section-title">⚡ Quick Actions</div>', unsafe_allow_html=True)
    qcol1, qcol2, qcol3 = st.columns(3)
    with qcol1:
        if st.button("🔴  Report Lost Item", key="dash_lost", use_container_width=True):
            navigate_to("🔴 Report Lost Item")
    with qcol2:
        if st.button("🟢  Report Found Item", key="dash_found", use_container_width=True):
            navigate_to("🟢 Report Found Item")
    with qcol3:
        if st.button("🔍  Find Matches", key="dash_matches", use_container_width=True):
            navigate_to("🔍 Find Matches")

    st.markdown("---")

    # ── Pipeline + AI Architecture ──
    col_pipe, col_ai = st.columns(2)

    with col_pipe:
        st.markdown('<div class="findr-section-title">📋 Verification Pipeline</div>', unsafe_allow_html=True)
        pipeline_html = (
            render_pipeline_item("⏳", stats.get("matches_pending", 0), "Pending review", "var(--warning)")
            + render_pipeline_item("🤝", stats.get("matches_confirmed", 0), "Items reunited", "var(--success)")
            + render_pipeline_item("❌", stats.get("matches_dismissed", 0), "Dismissed", "var(--danger)")
            + render_pipeline_item("📦", stats.get("matched_reports", 0), "Reports completed", "var(--accent-violet-light)")
        )
        st.markdown(pipeline_html, unsafe_allow_html=True)

        # Review matches shortcut
        pending_n = stats.get("matches_pending", 0)
        if pending_n > 0:
            st.markdown("<br>", unsafe_allow_html=True)
            if st.button(f"🤝 Review {pending_n} Pending Match(es)", key="dash_review", use_container_width=True):
                navigate_to("🤝 Verification / Review")

    with col_ai:
        st.markdown('<div class="findr-section-title">🤖 AI Engine</div>', unsafe_allow_html=True)
        if validate_api_key():
            st.markdown(
                "- 🟢 **SDK:** Google GenAI Python SDK\n"
                "- 🔢 **Embeddings:** `gemini-embedding-2` (768-dim, 65% weight)\n"
                "- 👁️ **Vision:** `gemini-3.8-flash` (25% weight)\n"
                "- 📍 **Location:** Token overlap (10% weight)\n"
                "- ⚖️ **Renormalization:** Dynamic (rescales when models are unavailable)"
            )
        else:
            st.markdown("- 🔴 **Gemini API:** Not configured")
            render_api_error("GEMINI_API_KEY is not set.")

    st.markdown("---")

    # ── Recent Reports ──
    st.markdown('<div class="findr-section-title">🕒 Recent Reports</div>', unsafe_allow_html=True)
    all_reports = database.get_all_reports()

    if all_reports:
        is_staff = st.session_state.get("staff_authenticated", False)
        for r in all_reports[:6]:
            render_report_card(
                r,
                show_image=True,
                is_matched=(r.get("status") == "matched"),
                is_staff=is_staff,
            )
    else:
        render_empty_state(
            "No reports submitted yet. Use the Quick Actions above to report a lost or found item!",
            icon="📝",
        )


# ---------------------------------------------------------------------------
# Page: Report Item (Lost / Found)
# ---------------------------------------------------------------------------
def page_report_item(report_type: str):
    """Reporting form for lost or found items with image validation and AI indexing."""
    type_label = "Lost" if report_type == "lost" else "Found"
    type_emoji = "🔴" if report_type == "lost" else "🟢"

    render_page_header(
        f"{type_emoji} Report {type_label} Item",
        f"Submit a report for an item {report_type} on campus. Photos enable multimodal AI matching.",
        show_dashboard_button=True,
    )

    is_staff = st.session_state.get("staff_authenticated", False)
    if not is_staff:
        st.info(
            "ℹ️ **Exhibition Demo Mode**: Public visitors can explore the form. "
            "To submit an official report, enter the Exhibition Passcode in the sidebar."
        )

    with st.form(f"report_{report_type}_form", clear_on_submit=True):
        # Image upload at the top for mobile friendliness
        uploaded_file = st.file_uploader(
            "📷 Upload Photograph *",
            type=["jpg", "jpeg", "png", "webp"],
            help=f"A clear image of the item. Max {MAX_IMAGE_SIZE_MB} MB.",
        )

        if uploaded_file:
            st.image(uploaded_file, caption="Preview", width=260)

        st.markdown("---")

        title = st.text_input(
            "Item Title *",
            placeholder="e.g. Space Grey MacBook Air M2",
            max_chars=100,
        )
        category = st.selectbox("Category *", options=CATEGORIES)
        location = st.text_input(
            "Campus Location *",
            placeholder="e.g. Main Library 2nd Floor, near windows",
            max_chars=200,
        )
        description = st.text_area(
            "Detailed Description *",
            placeholder="Describe colour, materials, brand, stickers, scratches, case, or contents...",
            height=120,
            max_chars=1000,
        )
        contact_info = st.text_input(
            "Contact Information (Optional)",
            placeholder="Email or mobile — kept private until match confirmation",
            max_chars=200,
        )

        submitted = st.form_submit_button(
            f"Submit {type_label} Report",
            type="primary",
            use_container_width=True,
        )

    if submitted:
        if not is_staff:
            st.error(
                "🔒 **Staff Authorization Required**: Official report submissions are protected during "
                "the public exhibition. Please enter the Exhibition Passcode in the sidebar to authorize submissions."
            )
            return

        # Input validation
        errors = []
        if not title or not title.strip():
            errors.append("Item title is required.")
        if not description or not description.strip():
            errors.append("Description is required.")
        if not location or not location.strip():
            errors.append("Campus location is required.")
        if not uploaded_file:
            errors.append("A photograph is required to enable multimodal matching.")

        if errors:
            for err in errors:
                st.error(f"⚠️ {err}")
            return

        # Preprocess image
        image_bytes = uploaded_file.getvalue()
        try:
            processed_bytes, _ = ai_engine.preprocess_image(image_bytes)
        except ai_engine.ImageValidationError as e:
            st.error(f"Image validation failed: {e}")
            return

        # Save image to storage
        image_path = _save_uploaded_image(uploaded_file)
        if image_path is None:
            return

        # AI processing
        ai_attributes, embedding = _process_with_ai(processed_bytes, description)

        # Store report in SQLite
        report_id = database.create_report(
            report_type=report_type,
            title=title,
            description=description,
            category=category,
            location=location,
            image_path=image_path,
            ai_attributes=ai_attributes,
            embedding=embedding,
            contact_info=contact_info.strip() if contact_info else None,
        )

        human_type = "LOST ITEM" if report_type == "lost" else "FOUND ITEM"
        st.success(f"🎉 **{human_type}** submitted successfully!")

        # Automated candidate matching
        with st.spinner("🔍 Searching for matching items..."):
            matches = matcher.find_and_store_matches(report_id)

        if matches:
            st.info(
                f"🎯 **Match Alert**: Found **{len(matches)} potential candidate(s)**! "
                f"Top similarity: **{matches[0].final_score * 100:.0f}%**."
            )
        else:
            st.caption(
                "ℹ️ No immediate matches found. The engine will check as new reports arrive."
            )

        # Post-submission navigation
        col_post1, col_post2 = st.columns(2)
        with col_post1:
            if st.button("🔍 Check Matches", key=f"post_chk_{report_id}", type="primary", use_container_width=True):
                navigate_to("🔍 Find Matches")
        with col_post2:
            if st.button("🏠 Dashboard", key=f"post_dash_{report_id}", use_container_width=True):
                navigate_to("📊 Dashboard")


# ---------------------------------------------------------------------------
# Page: Find Matches
# ---------------------------------------------------------------------------
def page_find_matches():
    """Interactive matching interface with side-by-side comparison."""
    render_page_header(
        "🔍 Find Matches",
        "Compare reports using multimodal similarity (65%), visual attributes (25%), and location (10%).",
        show_dashboard_button=True,
    )

    # Fetch all reports
    all_reports = database.get_all_reports()
    if not all_reports:
        render_empty_state(
            "No reports in database. Submit lost or found reports to begin matching!",
            icon="📭",
        )
        return

    # Filter controls
    type_choice = st.radio(
        "Filter Reports",
        options=["Active Lost Items", "Active Found Items", "All Reports"],
        horizontal=True,
    )

    if type_choice == "Active Lost Items":
        filtered = [r for r in all_reports if r["type"] == "lost" and r["status"] == "active"]
    elif type_choice == "Active Found Items":
        filtered = [r for r in all_reports if r["type"] == "found" and r["status"] == "active"]
    else:
        filtered = all_reports

    if not filtered:
        render_empty_state(f"No reports under '{type_choice}'.", icon="🔎")
        return

    # Dropdown selector
    def _format_report_label(rep_id: int) -> str:
        rep = next((r for r in filtered if r["id"] == rep_id), None)
        if not rep:
            return "Unknown Item"
        label_type = "LOST ITEM" if rep["type"] == "lost" else "FOUND ITEM"
        return f"[{label_type}] {rep['title']} ({rep['category']}) — 📍 {rep['location']}"

    selected_id = st.selectbox(
        "Select Item",
        options=[r["id"] for r in filtered],
        format_func=_format_report_label,
    )
    source_report = database.get_report(selected_id)

    if not source_report:
        st.error("Report could not be loaded from database.")
        return

    # Selected report overview
    is_staff = st.session_state.get("staff_authenticated", False)
    render_report_card(
        source_report,
        show_image=True,
        is_matched=(source_report.get("status") == "matched"),
        is_staff=is_staff,
    )

    if source_report.get("status") == "matched":
        st.info("🤝 This report has been confirmed as MATCHED.")

    st.markdown("---")

    # Match action
    col_act, col_info = st.columns([1, 3])
    with col_act:
        scan_btn = st.button("🔍 Search Matches", type="primary", use_container_width=True)
    with col_info:
        st.caption(
            "Strict category matching • Opposite types (lost ↔ found) • "
            "Dynamic weight renormalization"
        )

    # Trigger or retrieve matches
    if scan_btn:
        with st.spinner("🤖 Running multi-factor matching engine..."):
            results = matcher.find_and_store_matches(selected_id)
    else:
        # Load existing matches from database
        stored_matches = database.get_matches_for_report(selected_id)
        results = []
        if stored_matches:
            for m in stored_matches:
                other_id = m["found_report_id"] if m["lost_report_id"] == selected_id else m["lost_report_id"]
                other_report = database.get_report(other_id)
                if other_report:
                    results.append(
                        matcher.MatchResult(
                            report=other_report,
                            final_score=m["similarity_score"],
                            embedding_score=m.get("embedding_score"),
                            attribute_score=m.get("attribute_score"),
                            location_score=m.get("location_score"),
                            explanation=m.get("explanation") or "",
                            effective_weights={},
                            details={},
                        )
                    )

    # Render Results
    if not results:
        render_empty_state(
            "No candidate matches above the similarity threshold. "
            "Matches appear automatically as complementary items are submitted.",
            icon="🔎",
        )
        return

    st.markdown(f"### 🎯 Potential Matches ({len(results)})")

    for idx, match_item in enumerate(results):
        candidate = match_item.report

        # Determine lost and found IDs
        if source_report["type"] == "lost":
            lost_id, found_id = source_report["id"], candidate["id"]
        else:
            lost_id, found_id = candidate["id"], source_report["id"]

        # Fetch match record
        match_record = database.get_match_between(lost_id, found_id)
        match_id = match_record["id"] if match_record else None
        match_status = match_record["status"] if match_record else "pending"

        # Render match card
        user_action = render_match_card(
            source_report=source_report,
            match_report=candidate,
            score=match_item.final_score,
            explanation=match_item.explanation,
            match_id=match_id,
            match_status=match_status,
            is_staff=is_staff,
        )

        # Handle verification
        if user_action == "confirm" and match_id:
            if not is_staff:
                st.error("🔒 **Staff Authorization Required**: Only authorized exhibition staff can confirm matches. Enter the Staff Passcode in the sidebar.")
            else:
                success = database.confirm_match(match_id)
                if success:
                    st.success(
                        "🎉 **Match Confirmed!** The lost and found items are now linked. "
                        "Contact details unlocked."
                    )
                    st.rerun()
                else:
                    st.error(
                        "⚠️ This found item already has a confirmed match."
                    )
        elif user_action == "dismiss" and match_id:
            if not is_staff:
                st.error("🔒 **Staff Authorization Required**: Only authorized exhibition staff can dismiss matches.")
            else:
                database.dismiss_match(match_id)
                st.info("Match candidate dismissed.")
                st.rerun()
        elif user_action == "unsure":
            st.caption("ℹ️ Left in pending review.")


# ---------------------------------------------------------------------------
# Page: Verification / Review Matches
# ---------------------------------------------------------------------------
def page_verification_review():
    """Dedicated human verification and match review interface."""
    render_page_header(
        "🤝 Verification & Review",
        "Review candidate matches, inspect breakdown, and confirm item returns.",
        show_dashboard_button=True,
    )

    # Filter
    status_filter = st.radio(
        "Filter",
        options=["Pending Review", "Confirmed", "Dismissed", "All"],
        horizontal=True,
    )

    status_map = {
        "Pending Review": "pending",
        "Confirmed": "confirmed",
        "Dismissed": "dismissed",
        "All": None,
    }

    matches = database.get_all_matches(status=status_map[status_filter])

    if not matches:
        render_empty_state(f"No match records under '{status_filter}'.", icon="🤝")
        return

    st.caption(f"**{len(matches)}** match record(s)")
    is_staff = st.session_state.get("staff_authenticated", False)

    for m in matches:
        lost_report = database.get_report(m["lost_report_id"])
        found_report = database.get_report(m["found_report_id"])

        if not lost_report or not found_report:
            continue

        user_action = render_match_card(
            source_report=lost_report,
            match_report=found_report,
            score=m["similarity_score"],
            explanation=m.get("explanation") or "",
            match_id=m["id"],
            match_status=m["status"],
            is_staff=is_staff,
        )

        if user_action == "confirm":
            if not is_staff:
                st.error("🔒 **Staff Authorization Required**: Only authorized exhibition staff can confirm matches. Enter the Staff Passcode in the sidebar.")
            else:
                success = database.confirm_match(m["id"])
                if success:
                    st.success("🎉 Match confirmed! Both items marked as MATCHED.")
                    st.rerun()
                else:
                    st.error("⚠️ This found item already has a confirmed match.")

        elif user_action == "dismiss":
            if not is_staff:
                st.error("🔒 **Staff Authorization Required**: Only authorized exhibition staff can dismiss matches.")
            else:
                database.dismiss_match(m["id"])
                st.info("Match candidate dismissed.")
                st.rerun()

        elif user_action == "unsure":
            st.caption("ℹ️ Left in pending review.")


# ---------------------------------------------------------------------------
# Page: All Reports
# ---------------------------------------------------------------------------
def page_all_reports():
    """Browse and filter all reports."""
    render_page_header(
        "📋 All Campus Reports",
        "Search and inspect reports by type, category, status, or keyword.",
        show_dashboard_button=True,
    )

    # Filter bar — stack-friendly for mobile
    col1, col2, col3 = st.columns(3)
    with col1:
        type_filter = st.selectbox("Report Type", options=["All", "Lost", "Found"])
    with col2:
        category_filter = st.selectbox("Category", options=["All"] + CATEGORIES)
    with col3:
        status_filter = st.selectbox("Status", options=["All", "Active", "Matched", "Resolved"])

    search_query = st.text_input("🔍 Search", placeholder="Search title, description, or location...")

    # Load and filter
    reports = database.get_all_reports()

    if type_filter != "All":
        reports = [r for r in reports if r["type"] == type_filter.lower()]
    if category_filter != "All":
        reports = [r for r in reports if r["category"] == category_filter]
    if status_filter != "All":
        reports = [r for r in reports if r["status"] == status_filter.lower()]
    if search_query and search_query.strip():
        q = search_query.strip().lower()
        reports = [
            r for r in reports
            if q in r["title"].lower() or q in r["description"].lower() or q in r["location"].lower()
        ]

    st.caption(f"**{len(reports)}** report(s)")
    st.markdown("---")

    if reports:
        is_staff = st.session_state.get("staff_authenticated", False)
        for report in reports:
            render_report_card(
                report,
                show_image=True,
                is_matched=(report.get("status") == "matched"),
                is_staff=is_staff,
            )
    else:
        render_empty_state("No reports match your current filters.", icon="🔍")


# ---------------------------------------------------------------------------
# Router — uses current_page as the single source of truth
# ---------------------------------------------------------------------------
current_page = st.session_state["current_page"]

if current_page == "📊 Dashboard":
    page_dashboard()
elif current_page == "🔴 Report Lost Item":
    page_report_item("lost")
elif current_page == "🟢 Report Found Item":
    page_report_item("found")
elif current_page == "🔍 Find Matches":
    page_find_matches()
elif current_page == "🤝 Verification / Review":
    page_verification_review()
elif current_page == "📋 All Reports":
    page_all_reports()
else:
    page_dashboard()
