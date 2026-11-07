# FINDR — AI-Powered Campus Lost & Found Platform

FINDR is a university campus lost-and-found intelligence platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Google Gemini**, and **Supabase PostgreSQL & Storage**, deployed to **Vercel**.

---

## Architecture & Technology Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS with dark purple/violet SaaS identity
- **AI Engine**: Google Gemini API (`gemini-3.8-flash` for attribute extraction, `gemini-embedding-2` for 768-dimensional multimodal embeddings)
- **Matching Model**: 65–25–10 composite similarity engine:
  - 65% Multimodal joint text + image cosine similarity
  - 25% Structured visual attribute overlap (color, material, brand, distinctive features)
  - 10% Campus location context similarity
  - Dynamic weight renormalization when attributes or embeddings are unavailable
- **Database & Storage**: Supabase PostgreSQL with Row Level Security (RLS) & private `findr-images` storage bucket
- **Deployment**: Vercel serverless edge and server runtime

---

## Two Distinct System Modes

### 1. Student / User Mode
- **Report Submission**: Report lost or found belongings with auto-extracted visual attributes and embedding generation.
- **Privacy by Default**: Sensitive contact details and found verification secrets are protected and locked.
- **Active Reports**: Live tracking of logged items.

### 2. Staff / Supervisor Mode
- **Match Review Queue**: Inspect AI-ranked potential matches side-by-side with 65-25-10 breakdown and explanation.
- **Verification & Handover**: Human verification required before confirming matches.
- **Disclose Contact**: Confirmed matches unlock contact details for both parties to coordinate recovery.
- **Audit Trail**: Every verification, confirmation, and dismissal action is logged.

---

## Local Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env.local` and set your credentials:
```bash
cp .env.example .env.local
```

### 3. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Supervisor Account Bootstrap

Bootstrap the first campus supervisor account via the local CLI script:
```bash
npm run bootstrap -- <supervisor_email> <password> "Supervisor Full Name"
```

---

## Deployment to Vercel

1. **Connect Repository**: Import the GitHub repository into your Vercel dashboard.
2. **Configure Environment Variables**:
   - `GEMINI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_STORAGE_BUCKET` (`findr-images`)
   - `DATABASE_URL`
3. **Deploy**: Vercel will automatically build and deploy the Next.js application.
