# FINDR — AI-Powered Campus Lost & Found Platform

FINDR is a lost-and-found matching platform built with Python, Streamlit, and Google's official `google-genai` SDK. It pairs **Gemini 3.8 Flash** for structured visual feature extraction with **Gemini Embedding 2** for unified multimodal semantic matching.

Designed for exhibition at the campus AI Summit, FINDR runs in local development mode using SQLite and local storage, and seamlessly scales to **Streamlit Community Cloud** with **Supabase Free** (PostgreSQL & private image storage) in production.

---

## Architecture & Core Tech

- **Interface:** Streamlit (dark-purple layout with violet accents, mobile-responsive)
- **Visual Understanding:** `gemini-3.8-flash` (structured JSON extraction: category, colors, materials, brands, distinctive features, condition)
- **Multimodal Embeddings:** `gemini-embedding-2` (768-dimensional joint image + text vector space stored as `BYTEA`/`BLOB`)
- **Database Layer:** Dual-engine adapter supporting **Supabase PostgreSQL** (production) and **SQLite** with WAL mode (local development)
- **Storage Layer:** **Private Supabase Storage** (`findr-images`) storing object paths in PostgreSQL and generating short-lived signed URLs on-demand for display (with local disk fallback for offline use)
- **Matching Pipeline:**
  - Opposite-type filter (`lost` ↔ `found`)
  - Strict category filter
  - **65%** Multimodal embedding cosine similarity
  - **25%** Structured visual attribute overlap
  - **10%** Location context token similarity
  - Dynamic weight renormalization
- **Human Verification & Integrity:**
  - Human verification step (Confirm / Dismiss / Not Sure)
  - Atomic multi-table database transactions with row-level locks (`SELECT ... FOR UPDATE`)
  - Database-level unique constraints preventing duplicate candidate pairs and double-confirmations
- **Exhibition Access Control:**
  - Public demo mode allows visitors to freely explore reports, execute searches, and inspect AI similarity scores
  - Report submissions, match confirmations, and unredacted contact details are protected behind an **Exhibition Passcode** (`EXHIBITION_ACCESS_CODE`)

---

## Quick Setup (Windows PowerShell)

### 1. Create and Activate Virtual Environment

```powershell
python -m venv .venv

# If script execution is restricted on your system, enable it for this session:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

.\.venv\Scripts\Activate.ps1
```

### 2. Install Dependencies

```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Configure Environment

Copy the configuration template:

```powershell
Copy-Item .env.example .env
```

Set your configuration in `.env`:
- `GEMINI_API_KEY`: Obtain from [Google AI Studio](https://aistudio.google.com/apikey).
- `EXHIBITION_ACCESS_CODE`: Passcode protecting report submissions and match confirmations. In development, defaults to `findr-dev-code` if unspecified; in production, must be explicitly configured with a strong secret.
- `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: (Optional in dev, required in production).

### 4. Run the Application

```powershell
streamlit run app.py
```

Open a browser to `http://localhost:8501`.

---

## Test Suites

| Test Suite | File | Description |
|---|---|---|
| **Supabase Adapter Suite** | `test_supabase_adapter.py` | Validates secret management, storage fallback, query translation, and atomic constraint logic offline. |
| **Live Cloud Integration** | `test_supabase_live.py` | Direct end-to-end integration test against a live Supabase project (PostgreSQL, private bucket upload, signed URL HTTP download, 768-dim BYTEA exact match, atomic locks, and cleanup). |
| **Matching Engine Suite** | `test_matcher.py` | 12/12 unit tests verifying cosine similarity, dynamic weight renormalization, and ranking. |
| **End-to-End Acceptance** | `test_e2e.py` | 9/9 step test covering the full cycle: submit → match → verify → atomic transaction → restart persistence. |
| **Milestone 1 Test** | `test_milestone1.py` | Database schema, CRUD, and connection baseline. |

To run the complete test suite:
```powershell
python test_supabase_adapter.py
python test_matcher.py
python test_e2e.py
```

---

## Deployment

Complete step-by-step instructions for deploying to **Streamlit Community Cloud** and configuring **Supabase Free** are documented in:
👉 **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)**
