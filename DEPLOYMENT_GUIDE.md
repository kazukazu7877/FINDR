# FINDR — Deployment Guide: Streamlit Community Cloud + Supabase Free

This guide provides the complete, authoritative instructions for deploying **FINDR** using **Streamlit Community Cloud** (FREE app hosting) and **Supabase Free** (PostgreSQL database & private object storage).

---

## Architecture Overview

```
                               ┌────────────────────────────────────────┐
                               │       Streamlit Community Cloud        │
                               │           (Python 3.12 App)            │
                               └───────┬──────────────────────┬─────────┘
                                       │                      │
                                       ▼                      ▼
                     ┌───────────────────────────┐ ┌──────────────────────┐
                     │   Supabase PostgreSQL     │ │   Supabase Storage   │
                     │  (Reports & Matches ACID) │ │   (Private Bucket)   │
                     └───────────────────────────┘ └──────────────────────┘
```

- **Database Layer**: Dual-engine adapter. Connects to Supabase PostgreSQL when `DATABASE_URL` is set; defaults to local SQLite (`findr.db`) when unset.
- **Storage Layer**: Photograph attachments are stored in a **PRIVATE** Supabase Storage bucket (`findr-images`). Object paths (e.g. `reports/uuid.jpg`) are saved in PostgreSQL. Short-lived signed URLs (1-hour validity) are generated on-demand to display photographs.
- **Security & Roles**:
  - Connection via `DATABASE_URL` uses the `postgres` user. In PostgreSQL, table owners and superusers bypass Row Level Security (RLS) by default. Therefore, access control is enforced at the application level via an **Exhibition Passcode** (`EXHIBITION_ACCESS_CODE`), strict SQL parameterization, and database-level unique constraints.
  - Storage operations require the backend **`SUPABASE_SERVICE_ROLE_KEY`**. Never expose this key to client-side code or public logs.
  - Contact information is protected and redacted from public visitors. Unredacted contact details and write/confirmation actions require staff authorization.

---

## Step 1: Set Up Supabase Project (5 Minutes)

### 1.1 Create Supabase Project
1. Log in to [supabase.com](https://supabase.com) and click **New Project**.
2. Name the project (e.g. `findr-production`), set a strong database password, and select your preferred hosting region.
3. Allow 1-2 minutes for the database instance to provision.

### 1.2 Run PostgreSQL Schema Migration
1. From the left navigation menu, click **SQL Editor**.
2. Click **New Query**.
3. Open `supabase_schema.sql` from this repository, copy all contents, and paste into the query window.
4. Click **Run** (green button).
5. Verify that:
   - `reports` table is created with `BYTEA` embedding column.
   - `matches` table is created with `CONSTRAINT uq_matches_lost_found UNIQUE (lost_report_id, found_report_id)`.
   - Performance indexes and RLS policies are applied.

### 1.3 Create the PRIVATE Image Storage Bucket
1. From the left navigation menu, click **Storage**.
2. Click **New Bucket**.
3. Set Bucket Name to: `findr-images`.
4. **IMPORTANT**: Keep **Public Bucket** toggled **OFF** (this keeps the bucket **PRIVATE**).
5. Click **Save**.

### 1.4 Collect Backend Credentials
1. In your Supabase project dashboard, click **Connect** (top navigation bar) or go to **Project Settings** (gear icon) → **Database**.
2. Scroll to **Connection string** → click the **URI** tab.
   - **Connection Pooler Modes**:
     - **Shared Session Pooler (port `5432`)** — **RECOMMENDED FOR FINDR**: Supabase's Session pooler supports persistent connections, transactions, and session-level locks (`SELECT ... FOR UPDATE`) used during match confirmation.
     - **Transaction Pooler (port `6543`)**: Suitable only for stateless serverless functions; does NOT support session locks or prepared statements.
   - **Connection String Format**:
     - Copy the Session pooler URI (or direct URI) and ensure `?sslmode=require` is present:
     - `postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require`
     - Replace `[YOUR-PASSWORD]` with your actual database password.
3. Go to **Project Settings** → **API**.
   - Copy **Project URL** (this is `SUPABASE_URL`).
   - Scroll down to **Project API keys**:
     - Copy the **`service_role` (secret)** key (this is `SUPABASE_SERVICE_ROLE_KEY`).
     - Copy the **`anon` (public)** key (this is `SUPABASE_ANON_KEY`).

---

## Step 2: Push Repository to GitHub

In PowerShell or terminal at the project root (`Findr`):

```powershell
# 1. Initialize git repository (if not already done)
git init

# 2. Check git status
# Sensitive files (.env, findr.db, uploads/) are ignored by .gitignore
git status

# 3. Add and commit all application files
git add .
git commit -m "feat: complete FINDR deployment configuration with private storage"

# 4. Create a repository on GitHub (https://github.com/new), link and push:
git remote add origin https://github.com/YOUR_USERNAME/findr.git
git branch -M main
git push -u origin main
```

---

## Step 3: Deploy on Streamlit Community Cloud

1. Log in to [share.streamlit.io](https://share.streamlit.io) with your GitHub account.
2. Click **Create app** (or **New app**).
3. Fill in the app deployment fields:
   - **Repository**: `YOUR_USERNAME/findr`
   - **Branch**: `main`
   - **Main file path**: `app.py`
4. Click **Advanced settings** (or navigate to **App Settings** → **Secrets**).
5. Paste your configuration into the **Secrets** editor in TOML format:

```toml
# ==============================================================================
# Streamlit Community Cloud Secrets (secrets.toml)
# ==============================================================================

# 1. Explicit Environment Mode (Enforces cloud credentials & prohibits local fallback)
FINDR_ENV = "production"

# 2. Google Gemini AI API Key
GEMINI_API_KEY = "your-actual-gemini-api-key"

# 3. Supabase PostgreSQL Database URI (Shared Session Pooler - Port 5432)
# Copy from Supabase Dashboard -> Connect -> URI (Session Mode, port 5432)
DATABASE_URL = "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"

# 4. Supabase Storage & Server-Side Credentials
SUPABASE_URL = "https://[YOUR-PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY = "your-supabase-service-role-secret-key"
SUPABASE_ANON_KEY = "your-supabase-anon-public-key"
SUPABASE_STORAGE_BUCKET = "findr-images"

# 5. Exhibition Staff Access Passcode
# Must be a strong, privately configured secret (minimum 8 characters).
# Note: Insecure defaults like 'FINDR2026' will be rejected by production validation.
EXHIBITION_ACCESS_CODE = "YourStrongSecretPassphraseHere123!"
```

6. Click **Save** and **Deploy!**

---

## Step 4: Live Verification & Testing

### 4.1 Running the Live Cloud Integration Test
Before or after deploying to Streamlit Cloud, you can test your live Supabase setup directly:
1. Put your live credentials in your local `.env` file temporarily.
2. Run:
   ```bash
   python test_supabase_live.py
   ```
3. This verifies:
   - Live PostgreSQL connection & role verification.
   - Private bucket upload & signed URL download.
   - 768-dimensional float64 BYTEA embedding restoration.
   - Atomic match confirmation with row locks (`SELECT ... FOR UPDATE`).
   - Duplicate confirmation prevention.
   - Automatic cleanup of all test records and files.

### 4.2 Web Application Acceptance Checklist
- [ ] Visit the deployed Streamlit URL (`https://[app-name].streamlit.app`).
- [ ] Check Sidebar:
  - `● Embeddings: gemini-embedding-2` and `● Vision: gemini-3.8-flash` show active.
  - Exhibition Access shows `○ Visitor / Demo Mode`.
- [ ] In Visitor Mode:
  - Browse `📋 All Reports`: Item details are visible, contact info is securely protected.
  - Search `🔍 Find Matches`: Similarity calculations, visual attributes, and explanations work in read-only mode.
- [ ] In Staff Mode:
  - Enter the passcode (e.g. `FINDR2026`) in the sidebar under `🔑 Staff Access`.
  - Submit a test Lost report with photograph.
  - Submit a test Found report with photograph.
  - Confirm the match in `🤝 Verification / Review`: Verifies atomic status update and reveals contact details.

---

## Supabase Free Plan Operational Notes

Keep the following free-tier quotas and behaviors in mind:

1. **Inactivity Pausing**:
   - Supabase automatically pauses projects on the Free tier after **7 consecutive days of inactivity**.
   - If paused, the project will return a connection timeout.
   - To restore, go to your Supabase Dashboard and click **Restore Project** (takes ~1 to 2 minutes).
   - *Tip for exhibitions*: Log into your Supabase dashboard the morning of the exhibition to ensure the database is active.
2. **Database Storage Quota**:
   - **500 MB** PostgreSQL database limit. Since FINDR stores 768-dimensional float64 embeddings (6,144 bytes per report), 500 MB is sufficient for tens of thousands of campus reports.
3. **Storage Quota**:
   - **1 GB** file storage in Supabase Storage. With image resizing (~200 KB per photo), 1 GB accommodates ~5,000 photos.
4. **Bandwidth**:
   - **2 GB** egress bandwidth per month.
5. **Connection Limits**:
   - Direct connection (`port 5432`): max 60 concurrent connections.
   - Session pooler (`port 5432`) / Transaction pooler (`port 6543`): handles up to 200 pooled connections. Always use the pooler connection string on Streamlit Community Cloud.
