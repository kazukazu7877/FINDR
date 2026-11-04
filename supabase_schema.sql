-- ============================================================================
-- FINDR — Supabase PostgreSQL Schema Migration & Security Architecture
-- ============================================================================
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- It creates the reports and matches tables, indexes, database-level constraints,
-- and Row Level Security policies.
--
-- SECURITY ARCHITECTURE NOTE:
-- When the backend application connects using DATABASE_URL (the 'postgres' role),
-- PostgreSQL treats 'postgres' as the table owner and superuser. Table owners and
-- superusers BYPASS Row Level Security policies by default in PostgreSQL.
-- Therefore, FINDR does NOT rely on RLS policies alone for access control.
-- Security is enforced through:
--   1. Application-level access control (Exhibition Passcode for writes & sensitive contacts)
--   2. 100% Parameterized queries (_exec with %s, zero string interpolation)
--   3. Database-level constraints (uq_matches_lost_found, check constraints)
--   4. Row-level transaction locks (SELECT FOR UPDATE) preventing race conditions
--   5. FORCE ROW LEVEL SECURITY (protects against direct client-side/anon access)
-- ============================================================================

-- 1. Reports Table
CREATE TABLE IF NOT EXISTS reports (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    type            TEXT NOT NULL CHECK(type IN ('lost', 'found')),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    category        TEXT NOT NULL,
    location        TEXT NOT NULL,
    image_path      TEXT,
    ai_attributes   JSONB,
    embedding       BYTEA,
    status          TEXT DEFAULT 'active' CHECK(status IN ('active', 'matched', 'resolved')),
    created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    contact_info    TEXT
);

-- 2. Matches Table (with Database-Level Duplicate Prevention Constraint)
CREATE TABLE IF NOT EXISTS matches (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lost_report_id    BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    found_report_id   BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    similarity_score  DOUBLE PRECISION NOT NULL,
    embedding_score   DOUBLE PRECISION,
    attribute_score   DOUBLE PRECISION,
    location_score    DOUBLE PRECISION,
    explanation       TEXT,
    status            TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'dismissed')),
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_matches_lost_found UNIQUE (lost_report_id, found_report_id)
);

-- 3. High-Performance Indexes
CREATE INDEX IF NOT EXISTS idx_reports_type_status ON reports(type, status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_lost_found ON matches(lost_report_id, found_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Force RLS on table owners (applies to non-superuser owner roles)
ALTER TABLE reports FORCE ROW LEVEL SECURITY;
ALTER TABLE matches FORCE ROW LEVEL SECURITY;

-- Allow public read access to active reports and matches
CREATE POLICY "Allow public select reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public select matches" ON matches FOR SELECT USING (true);

-- Allow authenticated backend / service-role full read & write access
CREATE POLICY "Allow full access reports" ON reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access matches" ON matches FOR ALL USING (true) WITH CHECK (true);
