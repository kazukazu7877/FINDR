"""
FINDR UI Components
-------------------
Reusable Streamlit UI helpers, CSS theming, and styled components.
Dark-purple theme with violet accents. Mobile-responsive design.
"""

import base64
from pathlib import Path

import streamlit as st

# ---------------------------------------------------------------------------
# Theme CSS — Premium dark-purple/violet with mobile responsiveness
# ---------------------------------------------------------------------------

THEME_CSS = """
<style>
    /* ── Import Google Font ── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

    /* ── Root Variables ── */
    :root {
        --bg-primary: #0d0a1a;
        --bg-secondary: #150f2a;
        --bg-card: #1a1333;
        --bg-card-hover: #221a42;
        --bg-card-elevated: #1e1640;
        --bg-input: #1e1640;
        --bg-surface: #120e24;
        --border-subtle: rgba(139, 92, 246, 0.15);
        --border-accent: rgba(139, 92, 246, 0.35);
        --border-strong: rgba(139, 92, 246, 0.55);
        --text-primary: #f0eef5;
        --text-secondary: #b8aed4;
        --text-muted: #7b6f9e;
        --text-dim: #5a5078;
        --accent-violet: #8b5cf6;
        --accent-violet-light: #a78bfa;
        --accent-violet-glow: rgba(139, 92, 246, 0.25);
        --accent-purple: #7c3aed;
        --accent-indigo: #6366f1;
        --accent-lavender: #c4b5fd;
        --success: #34d399;
        --success-bg: rgba(52, 211, 153, 0.10);
        --warning: #fbbf24;
        --warning-bg: rgba(251, 191, 36, 0.10);
        --danger: #f87171;
        --danger-bg: rgba(248, 113, 113, 0.10);
        --info: #60a5fa;
        --info-bg: rgba(96, 165, 250, 0.10);
        --radius-xs: 6px;
        --radius-sm: 8px;
        --radius-md: 12px;
        --radius-lg: 16px;
        --radius-xl: 20px;
        --radius-pill: 100px;
        --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.2);
        --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.25), 0 0 0 1px var(--border-subtle);
        --shadow-elevated: 0 8px 32px rgba(0, 0, 0, 0.35), 0 0 0 1px var(--border-accent);
        --shadow-glow: 0 0 24px var(--accent-violet-glow);
        --transition-fast: 0.15s ease;
        --transition-base: 0.25s ease;
        --transition-smooth: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* ── Global ── */
    .stApp {
        background: var(--bg-primary) !important;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
        color: var(--text-primary) !important;
    }

    /* ── Sidebar ── */
    section[data-testid="stSidebar"] {
        background: var(--bg-secondary) !important;
        border-right: 1px solid var(--border-subtle) !important;
    }
    section[data-testid="stSidebar"] .stRadio > div {
        gap: 2px !important;
    }
    section[data-testid="stSidebar"] .stRadio label {
        color: var(--text-secondary) !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
        padding: 10px 14px !important;
        border-radius: var(--radius-sm) !important;
        transition: all var(--transition-base) !important;
        border: 1px solid transparent !important;
    }
    section[data-testid="stSidebar"] .stRadio label:hover {
        background: var(--bg-card) !important;
        color: var(--text-primary) !important;
        border-color: var(--border-subtle) !important;
    }
    section[data-testid="stSidebar"] .stRadio label[data-checked="true"],
    section[data-testid="stSidebar"] .stRadio [aria-checked="true"] ~ label {
        background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(99, 102, 241, 0.15)) !important;
        color: var(--accent-lavender) !important;
        border-color: var(--border-accent) !important;
    }

    /* ── Headers ── */
    h1, h2, h3, h4, h5, h6 {
        font-family: 'Inter', sans-serif !important;
        color: var(--text-primary) !important;
        line-height: 1.3 !important;
    }
    h1 {
        font-weight: 800 !important;
        letter-spacing: -0.03em !important;
        font-size: 2rem !important;
    }
    h2 {
        font-weight: 700 !important;
        letter-spacing: -0.02em !important;
        font-size: 1.5rem !important;
    }
    h3 {
        font-weight: 600 !important;
        font-size: 1.2rem !important;
        color: var(--text-secondary) !important;
    }

    /* ── Comprehensive Input & Form Styling ── */
    /* Target Streamlit / BaseWeb input containers */
    div[data-baseweb="input"],
    div[data-baseweb="base-input"],
    div[data-baseweb="textarea"],
    div[data-baseweb="select"],
    .stTextInput > div > div,
    .stTextArea > div > div,
    .stSelectbox > div > div,
    .stNumberInput > div > div,
    .stDateInput > div > div {
        background-color: #1e1640 !important;
        border: 1px solid var(--border-accent) !important;
        border-radius: var(--radius-sm) !important;
        transition: border-color var(--transition-base), box-shadow var(--transition-base) !important;
    }

    /* Target the actual input and textarea elements — ensure high contrast entered text */
    div[data-baseweb="input"] input,
    div[data-baseweb="base-input"] input,
    div[data-baseweb="textarea"] textarea,
    .stTextInput input,
    .stTextArea textarea,
    .stNumberInput input,
    .stDateInput input {
        background-color: transparent !important;
        color: #ffffff !important;
        -webkit-text-fill-color: #ffffff !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.95rem !important;
        line-height: 1.5 !important;
    }

    /* Input placeholders — soft, legible lavender */
    div[data-baseweb="input"] input::placeholder,
    div[data-baseweb="textarea"] textarea::placeholder,
    .stTextInput input::placeholder,
    .stTextArea textarea::placeholder {
        color: var(--text-secondary) !important;
        -webkit-text-fill-color: var(--text-secondary) !important;
        opacity: 0.75 !important;
    }

    /* Input Focus States — prominent violet glow */
    div[data-baseweb="input"]:focus-within,
    div[data-baseweb="base-input"]:focus-within,
    div[data-baseweb="textarea"]:focus-within,
    div[data-baseweb="select"]:focus-within,
    .stTextInput > div > div:focus-within,
    .stTextArea > div > div:focus-within,
    .stSelectbox > div > div:focus-within {
        border-color: var(--accent-violet) !important;
        box-shadow: 0 0 0 3px var(--accent-violet-glow) !important;
    }

    /* Disabled Input States */
    div[data-baseweb="input"][aria-disabled="true"],
    div[data-baseweb="input"]:disabled,
    input:disabled,
    textarea:disabled {
        background-color: #140e2b !important;
        color: var(--text-dim) !important;
        -webkit-text-fill-color: var(--text-dim) !important;
        border-color: var(--border-subtle) !important;
        cursor: not-allowed !important;
    }

    /* Selectbox selected value display */
    div[data-baseweb="select"] span,
    div[data-baseweb="select"] div,
    .stSelectbox [data-baseweb="select"] * {
        color: #ffffff !important;
    }

    /* Dropdown Menus & Popovers (renders in document body portal) */
    div[data-baseweb="popover"],
    div[data-baseweb="popover"] > div,
    ul[role="listbox"],
    ul[data-baseweb="menu"] {
        background-color: #1a1333 !important;
        border: 1px solid var(--border-accent) !important;
        border-radius: var(--radius-sm) !important;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
    }
    li[role="option"] {
        background-color: #1a1333 !important;
        color: var(--text-primary) !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.9rem !important;
        padding: 10px 14px !important;
        transition: background-color var(--transition-fast) !important;
    }
    li[role="option"]:hover,
    li[role="option"][aria-selected="true"] {
        background-color: #2b1d52 !important;
        color: var(--accent-lavender) !important;
    }

    /* Form Labels */
    .stTextInput label,
    .stTextArea label,
    .stSelectbox label,
    .stNumberInput label,
    .stDateInput label,
    .stFileUploader label,
    [data-testid="stWidgetLabel"] label,
    [data-testid="stWidgetLabel"] p {
        color: var(--text-secondary) !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
    }

    /* ── Buttons ── */
    .stButton > button {
        background: linear-gradient(135deg, var(--accent-purple), var(--accent-indigo)) !important;
        color: white !important;
        border: none !important;
        border-radius: var(--radius-sm) !important;
        font-weight: 600 !important;
        font-family: 'Inter', sans-serif !important;
        font-size: 0.9rem !important;
        padding: 0.55rem 1.4rem !important;
        min-height: 44px !important;
        transition: all var(--transition-smooth) !important;
        box-shadow: 0 2px 10px rgba(124, 58, 237, 0.25) !important;
    }
    .stButton > button:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4) !important;
        filter: brightness(1.08) !important;
    }
    .stButton > button:active {
        transform: translateY(0) !important;
    }

    /* ── Metrics ── */
    [data-testid="stMetric"] {
        background: var(--bg-card) !important;
        border: 1px solid var(--border-subtle) !important;
        border-radius: var(--radius-md) !important;
        padding: 1.1rem 1rem !important;
        transition: all var(--transition-base) !important;
    }
    [data-testid="stMetric"]:hover {
        border-color: var(--border-accent) !important;
        box-shadow: var(--shadow-glow) !important;
    }
    [data-testid="stMetricValue"] {
        color: var(--accent-violet-light) !important;
        font-weight: 700 !important;
        font-size: 1.8rem !important;
    }
    [data-testid="stMetricLabel"] {
        color: var(--text-secondary) !important;
        font-size: 0.85rem !important;
        font-weight: 500 !important;
    }

    /* ── Tabs ── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 4px !important;
        background: var(--bg-secondary) !important;
        border-radius: var(--radius-md) !important;
        padding: 4px !important;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: var(--radius-sm) !important;
        color: var(--text-secondary) !important;
        font-weight: 500 !important;
        font-size: 0.9rem !important;
    }
    .stTabs [aria-selected="true"] {
        background: var(--accent-purple) !important;
        color: white !important;
    }

    /* ── Match Analysis & Breakdown / Expander / Code Blocks ── */
    /* Eliminate all white backgrounds from expanders and code blocks */
    [data-testid="stExpander"],
    .streamlit-expanderHeader {
        background: #150f2a !important;
        border: 1px solid var(--border-accent) !important;
        border-radius: var(--radius-md) !important;
        margin-top: 0.8rem !important;
        margin-bottom: 0.8rem !important;
        overflow: hidden !important;
    }
    [data-testid="stExpander"] details {
        background: #150f2a !important;
    }
    [data-testid="stExpander"] summary {
        background: #1e1640 !important;
        color: var(--text-primary) !important;
        font-weight: 600 !important;
        border-radius: var(--radius-md) !important;
        padding: 0.75rem 1rem !important;
        transition: background var(--transition-fast) !important;
    }
    [data-testid="stExpander"] summary:hover {
        background: #251b4e !important;
        color: var(--accent-lavender) !important;
    }
    [data-testid="stExpander"] [data-testid="stExpanderDetails"] {
        background: #150f2a !important;
        color: var(--text-primary) !important;
        padding: 1rem !important;
        border-top: 1px solid var(--border-subtle) !important;
    }

    /* Code blocks — strictly dark aubergine, NO white background */
    .stCodeBlock,
    .stCodeBlock pre,
    [data-testid="stCodeBlock"],
    [data-testid="stCodeBlock"] pre,
    pre {
        background-color: #0e0920 !important;
        border: 1px solid rgba(139, 92, 246, 0.25) !important;
        border-radius: var(--radius-sm) !important;
        color: #e2d9f3 !important;
        padding: 0.8rem !important;
    }
    .stCodeBlock code,
    [data-testid="stCodeBlock"] code,
    pre code,
    code {
        background-color: transparent !important;
        color: #e2d9f3 !important;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace !important;
        font-size: 0.88rem !important;
        line-height: 1.55 !important;
    }

    /* ── File Uploader ── */
    [data-testid="stFileUploader"] {
        background: var(--bg-card) !important;
        border: 2px dashed var(--border-accent) !important;
        border-radius: var(--radius-md) !important;
        padding: 1.2rem !important;
        transition: border-color var(--transition-base) !important;
    }
    [data-testid="stFileUploader"]:hover {
        border-color: var(--accent-violet) !important;
    }

    /* ── Divider ── */
    hr {
        border-color: var(--border-subtle) !important;
        margin: 1.2rem 0 !important;
    }

    /* ── Custom Card Classes ── */
    .findr-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
        margin-bottom: 1rem;
        box-shadow: var(--shadow-card);
        transition: all var(--transition-smooth);
    }
    .findr-card:hover {
        border-color: var(--border-accent);
        box-shadow: var(--shadow-card), var(--shadow-glow);
    }

    .findr-card-elevated {
        background: var(--bg-card-elevated);
        border: 1px solid var(--border-accent);
        border-radius: var(--radius-lg);
        padding: 1.8rem;
        margin-bottom: 1.2rem;
        box-shadow: var(--shadow-elevated);
    }

    /* ── Hero Section ── */
    .findr-hero {
        text-align: center;
        padding: 2.2rem 1rem 1.6rem 1rem;
        margin-bottom: 1.5rem;
    }
    .findr-hero-title {
        font-size: 3rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, #ffffff 0%, var(--accent-violet-light) 60%, var(--accent-lavender) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0.4rem;
        line-height: 1.15;
    }
    .findr-hero-subtitle {
        color: var(--accent-lavender);
        font-size: 1.12rem;
        font-style: italic;
        font-weight: 400;
        line-height: 1.5;
        max-width: 600px;
        margin: 0 auto;
        opacity: 0.95;
    }

    /* ── Section Title ── */
    .findr-section-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--text-primary);
        margin-bottom: 0.8rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    /* ── Stat Card (HTML) ── */
    .findr-stat-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 1.3rem 1rem;
        text-align: center;
        transition: all var(--transition-smooth);
    }
    .findr-stat-card:hover {
        border-color: var(--border-accent);
        box-shadow: var(--shadow-glow);
        transform: translateY(-2px);
    }
    .findr-stat-value {
        font-size: 2rem;
        font-weight: 800;
        color: var(--accent-violet-light);
        line-height: 1.2;
    }
    .findr-stat-label {
        font-size: 0.82rem;
        font-weight: 500;
        color: var(--text-secondary);
        margin-top: 4px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }

    /* ── Quick Action Cards ── */
    .findr-action-card {
        background: var(--bg-card);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 1.2rem;
        text-align: center;
        transition: all var(--transition-smooth);
        cursor: pointer;
    }
    .findr-action-card:hover {
        border-color: var(--border-accent);
        box-shadow: var(--shadow-glow);
        background: var(--bg-card-hover);
    }
    .findr-action-icon {
        font-size: 1.8rem;
        margin-bottom: 0.4rem;
    }
    .findr-action-title {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-primary);
    }
    .findr-action-desc {
        font-size: 0.78rem;
        color: var(--text-muted);
        margin-top: 2px;
    }

    /* ── Pipeline Item ── */
    .findr-pipeline-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.7rem 1rem;
        background: var(--bg-surface);
        border-radius: var(--radius-sm);
        margin-bottom: 0.5rem;
        border: 1px solid var(--border-subtle);
    }
    .findr-pipeline-count {
        font-size: 1.4rem;
        font-weight: 700;
        min-width: 36px;
    }
    .findr-pipeline-label {
        font-size: 0.88rem;
        color: var(--text-secondary);
        font-weight: 500;
    }

    /* ── Score Badge ── */
    .score-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 14px;
        border-radius: var(--radius-pill);
        font-weight: 700;
        font-size: 0.9rem;
    }
    .score-high {
        background: var(--success-bg);
        color: var(--success);
        border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .score-medium {
        background: var(--warning-bg);
        color: var(--warning);
        border: 1px solid rgba(251, 191, 36, 0.3);
    }
    .score-low {
        background: var(--danger-bg);
        color: var(--danger);
        border: 1px solid rgba(248, 113, 113, 0.3);
    }

    /* ── Status Badge ── */
    .status-active {
        color: var(--success);
        background: var(--success-bg);
        padding: 3px 12px;
        border-radius: var(--radius-pill);
        font-size: 0.78rem;
        font-weight: 600;
        letter-spacing: 0.02em;
    }
    .status-matched {
        color: var(--accent-violet-light);
        background: rgba(139, 92, 246, 0.12);
        padding: 3px 12px;
        border-radius: var(--radius-pill);
        font-size: 0.78rem;
        font-weight: 600;
    }
    .status-pending {
        color: var(--warning);
        background: var(--warning-bg);
        padding: 3px 12px;
        border-radius: var(--radius-pill);
        font-size: 0.78rem;
        font-weight: 600;
    }
    .status-confirmed {
        color: var(--success);
        background: var(--success-bg);
        padding: 3px 12px;
        border-radius: var(--radius-pill);
        font-size: 0.78rem;
        font-weight: 600;
    }
    .status-dismissed {
        color: var(--danger);
        background: var(--danger-bg);
        padding: 3px 12px;
        border-radius: var(--radius-pill);
        font-size: 0.78rem;
        font-weight: 600;
    }

    /* ── Type Badge ── */
    .type-lost {
        color: var(--danger);
        background: var(--danger-bg);
        padding: 4px 12px;
        border: 1px solid rgba(248, 113, 113, 0.25);
        border-radius: var(--radius-pill);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
    }
    .type-found {
        color: var(--success);
        background: var(--success-bg);
        padding: 4px 12px;
        border: 1px solid rgba(52, 211, 153, 0.25);
        border-radius: var(--radius-pill);
        font-weight: 700;
        text-transform: uppercase;
        font-size: 0.75rem;
        letter-spacing: 0.05em;
    }

    /* ── Logo styling ── */
    .findr-logo {
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        background: linear-gradient(135deg, var(--accent-violet-light), var(--accent-indigo));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    .findr-subtitle {
        color: var(--text-muted);
        font-size: 0.82rem;
        font-weight: 400;
        margin-top: -6px;
    }

    /* ── AI Badge ── */
    .findr-ai-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 10px;
        background: rgba(139, 92, 246, 0.1);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-pill);
        font-size: 0.75rem;
        color: var(--accent-lavender);
        font-weight: 500;
    }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar {
        width: 6px;
    }
    ::-webkit-scrollbar-track {
        background: var(--bg-primary);
    }
    ::-webkit-scrollbar-thumb {
        background: var(--border-accent);
        border-radius: 3px;
    }

    /* ── Streamlit Chrome Controls ── */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {
        background: transparent !important;
    }
    header [data-testid="stToolbar"] {
        visibility: hidden !important;
    }
    button[data-testid="stSidebarCollapseButton"] {
        visibility: visible !important;
        color: var(--accent-violet-light) !important;
    }
    button[data-testid="baseButton-headerNoPadding"] {
        visibility: visible !important;
        color: var(--accent-violet-light) !important;
    }

    /* ── Alert / Info / Warning boxes ── */
    .stAlert {
        border-radius: var(--radius-sm) !important;
        font-size: 0.9rem !important;
    }

    /* ── Caption ── */
    .stCaption, [data-testid="stCaptionContainer"] {
        color: var(--text-muted) !important;
        font-size: 0.82rem !important;
    }

    /* ══════════════════════════════════════════════════
       RESPONSIVE — Tablet (≤ 768px)
       ══════════════════════════════════════════════════ */
    @media (max-width: 768px) {
        h1 { font-size: 1.5rem !important; }
        h2 { font-size: 1.25rem !important; }
        h3 { font-size: 1.05rem !important; }

        .findr-hero { padding: 1.2rem 0.5rem; }
        .findr-hero-title { font-size: 1.8rem; }
        .findr-hero-subtitle { font-size: 0.92rem; }

        .findr-card { padding: 1.1rem; }
        .findr-card-elevated { padding: 1.2rem; }

        [data-testid="stMetricValue"] { font-size: 1.4rem !important; }
        [data-testid="stMetricLabel"] { font-size: 0.78rem !important; }
        [data-testid="stMetric"] { padding: 0.8rem 0.7rem !important; }

        .findr-stat-value { font-size: 1.5rem; }
        .findr-stat-label { font-size: 0.75rem; }

        .stButton > button {
            font-size: 0.85rem !important;
            padding: 0.5rem 1rem !important;
            min-height: 44px !important;
        }

        section[data-testid="stSidebar"] {
            min-width: 220px !important;
            max-width: 260px !important;
        }
    }

    /* ══════════════════════════════════════════════════
       RESPONSIVE — Mobile (≤ 480px)
       ══════════════════════════════════════════════════ */
    @media (max-width: 480px) {
        h1 { font-size: 1.3rem !important; }
        h2 { font-size: 1.1rem !important; }
        h3 { font-size: 0.95rem !important; }

        .findr-hero { padding: 1rem 0.3rem; }
        .findr-hero-title { font-size: 1.5rem; }
        .findr-hero-subtitle { font-size: 0.85rem; }

        .findr-card { padding: 0.9rem; margin-bottom: 0.8rem; }
        .findr-card-elevated { padding: 1rem; }

        [data-testid="stMetric"] { padding: 0.6rem !important; }
        [data-testid="stMetricValue"] { font-size: 1.2rem !important; }
        [data-testid="stMetricLabel"] { font-size: 0.72rem !important; }

        .findr-stat-value { font-size: 1.3rem; }
        .findr-stat-card { padding: 0.8rem 0.5rem; }

        .stButton > button {
            font-size: 0.82rem !important;
            padding: 0.45rem 0.8rem !important;
            min-height: 44px !important;
        }

        .findr-pipeline-item {
            padding: 0.5rem 0.7rem;
        }

        section[data-testid="stSidebar"] {
            min-width: 200px !important;
            max-width: 240px !important;
        }
        section[data-testid="stSidebar"] .stRadio label {
            padding: 8px 10px !important;
            font-size: 0.84rem !important;
        }

        /* Stack form columns on mobile */
        [data-testid="stHorizontalBlock"] {
            flex-wrap: wrap !important;
        }
    }
</style>
"""


def apply_theme():
    """Inject the custom CSS theme into the Streamlit app."""
    st.markdown(THEME_CSS, unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Reusable Components
# ---------------------------------------------------------------------------

def render_logo():
    """Render the FINDR logo in the sidebar."""
    st.markdown(
        '<div class="findr-logo">FINDR</div>'
        '<div class="findr-subtitle">AI-Powered Lost & Found</div>',
        unsafe_allow_html=True,
    )
    st.markdown("---")


def render_page_header(title: str, subtitle: str | None = None, show_dashboard_button: bool = True):
    """Render a persistent page header with title, subtitle, and an instant
    Return to Dashboard button that uses the correct internal nav key."""
    col_text, col_btn = st.columns([4, 1])
    with col_text:
        st.markdown(f"## {title}")
        if subtitle:
            st.caption(subtitle)
    with col_btn:
        if show_dashboard_button:
            btn_key = f"hdr_dash_{abs(hash(title)) % 100000}"
            if st.button("🏠 Dashboard", key=btn_key, use_container_width=True):
                st.session_state["current_page"] = "📊 Dashboard"
                st.rerun()


def render_hero():
    """Render the FINDR hero section for the dashboard."""
    st.markdown(
        '<div class="findr-hero">'
        '<div class="findr-hero-title">FINDR</div>'
        '<div class="findr-hero-subtitle">'
        'An AI-powered lost and found platform for your campus.'
        '</div>'
        '</div>',
        unsafe_allow_html=True,
    )


def render_stat_card(value: int | str, label: str, color: str = "var(--accent-violet-light)") -> str:
    """Return HTML for a styled statistics card."""
    return (
        f'<div class="findr-stat-card">'
        f'<div class="findr-stat-value" style="color: {color};">{value}</div>'
        f'<div class="findr-stat-label">{label}</div>'
        f'</div>'
    )


def render_pipeline_item(icon: str, count: int, label: str, color: str = "var(--text-secondary)") -> str:
    """Return HTML for a pipeline status item."""
    return (
        f'<div class="findr-pipeline-item">'
        f'<span class="findr-pipeline-count" style="color: {color};">{count}</span>'
        f'<span class="findr-pipeline-label">{icon} {label}</span>'
        f'</div>'
    )


def render_score_badge(score: float) -> str:
    """Return HTML for a colored score badge."""
    pct = f"{score * 100:.0f}%"
    if score >= 0.7:
        css_class = "score-high"
    elif score >= 0.45:
        css_class = "score-medium"
    else:
        css_class = "score-low"
    return f'<span class="score-badge {css_class}">{pct} similar</span>'


def render_status_badge(status: str) -> str:
    """Return HTML for a status badge."""
    return f'<span class="status-{status}">{status.upper()}</span>'


def render_type_badge(report_type: str) -> str:
    """Return HTML for a lost/found type badge with human-friendly labels."""
    label = "LOST ITEM" if report_type.lower() == "lost" else "FOUND ITEM"
    return f'<span class="type-{report_type.lower()}">{label}</span>'


def render_report_card(report: dict, show_image: bool = True, is_matched: bool = False, is_staff: bool = False):
    """Render a single report as a styled card with privacy-aware contact display."""
    st.markdown('<div class="findr-card">', unsafe_allow_html=True)

    col_info, col_img = st.columns([3, 1])

    with col_info:
        type_html = render_type_badge(report["type"])
        status_html = render_status_badge(report["status"])
        st.markdown(
            f"{type_html} &nbsp; {status_html}",
            unsafe_allow_html=True,
        )
        st.markdown(f"**{report['title']}**")
        st.markdown(f"📁 {report['category']} &nbsp;|&nbsp; 📍 {report['location']}")
        st.caption(report['description'][:200] + ("..." if len(report['description']) > 200 else ""))

        # Contact privacy handling — strict access control for public exhibition
        if report.get("contact_info"):
            if is_staff:
                st.markdown(f"📞 Contact: `{report['contact_info']}`")
            else:
                st.caption("🔒 Contact details protected — Staff Access Code required")

        # AI indicators
        indicators = []
        if report.get("embedding") is not None:
            indicators.append('<span class="findr-ai-badge">✨ 768-dim Embedding</span>')
        if report.get("ai_attributes"):
            attrs = report["ai_attributes"]
            if isinstance(attrs, dict) and any(attrs.values()):
                indicators.append('<span class="findr-ai-badge">🤖 AI Analyzed</span>')
        if indicators:
            st.markdown(" ".join(indicators), unsafe_allow_html=True)

    with col_img:
        if show_image and report.get("image_path"):
            import storage
            resolved_img = storage.resolve_image_source(report["image_path"])
            if resolved_img:
                st.image(resolved_img, use_container_width=True)

    st.markdown("</div>", unsafe_allow_html=True)


def render_match_card(
    source_report: dict,
    match_report: dict,
    score: float,
    explanation: str,
    match_id: int | None = None,
    match_status: str = "pending",
    is_staff: bool = False,
):
    """Render a match comparison card with side-by-side reports and human verification."""
    st.markdown('<div class="findr-card-elevated">', unsafe_allow_html=True)

    # Score header row
    col_score, col_status = st.columns([2, 1])
    with col_score:
        score_html = render_score_badge(score)
        st.markdown(f"**Match Confidence** &nbsp; {score_html}", unsafe_allow_html=True)
    with col_status:
        status_labels = {
            "confirmed": ('🤝 CONFIRMED', 'var(--success)'),
            "dismissed": ('❌ DISMISSED', 'var(--danger)'),
            "pending": ('⏳ PENDING REVIEW', 'var(--warning)'),
        }
        label, color = status_labels.get(match_status, ('⏳ PENDING', 'var(--warning)'))
        st.markdown(
            f'<div style="text-align: right; font-weight: 700; color: {color};">{label}</div>',
            unsafe_allow_html=True,
        )

    st.markdown("---")

    # Side-by-side comparison
    col_left, col_right = st.columns(2)

    for col, report, label in [
        (col_left, source_report, "Source"),
        (col_right, match_report, "Candidate"),
    ]:
        with col:
            type_html = render_type_badge(report['type'])
            st.markdown(
                f"{type_html}",
                unsafe_allow_html=True,
            )
            st.markdown(f"**{report['title']}**")
            if report.get("image_path"):
                import storage
                resolved_img = storage.resolve_image_source(report["image_path"])
                if resolved_img:
                    st.image(resolved_img, use_container_width=True)
            st.caption(f"📍 {report['location']}")
            st.caption(f"📁 {report['category']}")
            if report.get("contact_info"):
                if is_staff:
                    st.markdown(f"📞 Contact: `{report['contact_info']}`")
                else:
                    st.caption("🔒 Contact protected (Staff access required)")

    # Explanation / breakdown
    with st.expander("📊 Match Analysis & Breakdown", expanded=True):
        st.code(explanation, language=None)

    # Human verification buttons
    if match_id and match_status == "pending":
        st.markdown("---")
        st.markdown("**Verify this candidate match:**")
        if not is_staff:
            st.caption("🔒 Staff authentication required to confirm match or claim item.")
        btn_cols = st.columns(3)
        with btn_cols[0]:
            if st.button("✅ Confirm Match", key=f"confirm_{match_id}", type="primary"):
                return "confirm"
        with btn_cols[1]:
            if st.button("❌ Not a Match", key=f"dismiss_{match_id}"):
                return "dismiss"
        with btn_cols[2]:
            if st.button("🤔 Not Sure", key=f"unsure_{match_id}"):
                return "unsure"

    elif match_status == "confirmed":
        st.success("🤝 This match has been confirmed. Both reports are linked and closed.")

    st.markdown("</div>", unsafe_allow_html=True)
    return None


def render_api_error(message: str):
    """Display an API error with setup instructions."""
    st.error(f"⚠️ {message}")
    st.info(
        "**Setup Instructions:**\n"
        "1. Get a free API key at https://aistudio.google.com/apikey\n"
        "2. Add `GEMINI_API_KEY` to your Streamlit Cloud Secrets (App Settings → Secrets) or local `.env` file\n"
        "3. Restart or redeploy the app"
    )


def render_empty_state(message: str, icon: str = "📭"):
    """Display a friendly empty state message."""
    st.markdown(
        f"<div style='text-align: center; padding: 2.5rem 1rem; "
        f"color: var(--text-muted); "
        f"background: var(--bg-card); "
        f"border: 1px dashed var(--border-subtle); "
        f"border-radius: var(--radius-lg);'>"
        f"<div style='font-size: 2.5rem; margin-bottom: 0.8rem;'>{icon}</div>"
        f"<p style='font-size: 1rem; line-height: 1.5;'>{message}</p>"
        f"</div>",
        unsafe_allow_html=True,
    )
