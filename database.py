"""
FINDR Database Layer
--------------------
Dual-engine database layer supporting:
  - Supabase PostgreSQL in production
  - Local SQLite (findr.db) in development / testing

All queries are adapted transparently, and atomic multi-table match confirmation
is strictly preserved across both backends.
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path

import numpy as np

import config

# Module-level DB_PATH allows test isolation for SQLite
DB_PATH = config.DB_PATH


# ---------------------------------------------------------------------------
# Backend Detection & Connection Helpers
# ---------------------------------------------------------------------------

def is_postgres() -> bool:
    """Return True if configured to use Supabase / PostgreSQL."""
    return config.is_postgres()


def get_connection():
    """Return a database connection.

    In production mode (FINDR_ENV='production'):
        Strictly requires Supabase PostgreSQL via DATABASE_URL (Session pooler port 5432).
        Silent fallback to local SQLite is prohibited.
    In development mode:
        Uses PostgreSQL if DATABASE_URL is set, otherwise defaults to local SQLite (findr.db).
    """
    if config.is_production():
        if not is_postgres():
            raise config.ConfigurationError(
                "Production environment requires Supabase PostgreSQL (DATABASE_URL is missing). "
                "Silent fallback to local SQLite is prohibited in production."
            )
        import psycopg2
        from psycopg2.extras import RealDictCursor

        return psycopg2.connect(config.DATABASE_URL, cursor_factory=RealDictCursor)
    else:
        if is_postgres():
            import psycopg2
            from psycopg2.extras import RealDictCursor

            return psycopg2.connect(config.DATABASE_URL, cursor_factory=RealDictCursor)

        conn = sqlite3.connect(str(DB_PATH))
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.row_factory = sqlite3.Row  # access columns by name
        return conn


def _exec(conn, query: str, params: tuple | list = ()):
    """Execute a query with parameter adaptation (? for SQLite, %s for PostgreSQL)."""
    if is_postgres():
        adapted = query.replace("?", "%s")
        cur = conn.cursor()
        cur.execute(adapted, params)
        return cur
    else:
        return conn.execute(query, params)


# ---------------------------------------------------------------------------
# Schema Initialisation
# ---------------------------------------------------------------------------

def init_db() -> None:
    """Create tables and indexes if they do not exist."""
    conn = get_connection()
    try:
        if is_postgres():
            with conn.cursor() as cur:
                cur.execute("""
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
                        status          TEXT DEFAULT 'active'
                                        CHECK(status IN ('active', 'matched', 'resolved')),
                        created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        contact_info    TEXT
                    );

                    CREATE TABLE IF NOT EXISTS matches (
                        id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                        lost_report_id    BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                        found_report_id   BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
                        similarity_score  DOUBLE PRECISION NOT NULL,
                        embedding_score   DOUBLE PRECISION,
                        attribute_score   DOUBLE PRECISION,
                        location_score    DOUBLE PRECISION,
                        explanation       TEXT,
                        status            TEXT DEFAULT 'pending'
                                          CHECK(status IN ('pending', 'confirmed', 'dismissed')),
                        reviewed_at       TIMESTAMPTZ,
                        created_at        TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_matches_lost_found UNIQUE (lost_report_id, found_report_id)
                    );

                    CREATE INDEX IF NOT EXISTS idx_reports_type_status ON reports(type, status);
                    CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
                    CREATE INDEX IF NOT EXISTS idx_matches_lost_found ON matches(lost_report_id, found_report_id);
                    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
                """)
            conn.commit()
        else:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS reports (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    type            TEXT NOT NULL CHECK(type IN ('lost', 'found')),
                    title           TEXT NOT NULL,
                    description     TEXT NOT NULL,
                    category        TEXT NOT NULL,
                    location        TEXT NOT NULL,
                    image_path      TEXT,
                    ai_attributes   TEXT,
                    embedding       BLOB,
                    status          TEXT DEFAULT 'active'
                                    CHECK(status IN ('active', 'matched', 'resolved')),
                    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    contact_info    TEXT
                );

                CREATE TABLE IF NOT EXISTS matches (
                    id                INTEGER PRIMARY KEY AUTOINCREMENT,
                    lost_report_id    INTEGER NOT NULL REFERENCES reports(id),
                    found_report_id   INTEGER NOT NULL REFERENCES reports(id),
                    similarity_score  REAL NOT NULL,
                    embedding_score   REAL,
                    attribute_score   REAL,
                    location_score    REAL,
                    explanation       TEXT,
                    status            TEXT DEFAULT 'pending'
                                      CHECK(status IN ('pending', 'confirmed', 'dismissed')),
                    reviewed_at       TIMESTAMP,
                    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (lost_report_id, found_report_id)
                );
            """)
            conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Report CRUD
# ---------------------------------------------------------------------------

def create_report(
    report_type: str,
    title: str,
    description: str,
    category: str,
    location: str,
    image_path: str | None = None,
    ai_attributes: dict | None = None,
    embedding: np.ndarray | None = None,
    contact_info: str | None = None,
) -> int:
    """Insert a new report and return its id."""
    conn = get_connection()
    try:
        # Prepare embedding bytes
        emb_bytes = None
        if embedding is not None:
            emb_raw = embedding.astype(np.float32).tobytes()
            if is_postgres():
                import psycopg2
                emb_bytes = psycopg2.Binary(emb_raw)
            else:
                emb_bytes = emb_raw

        # Prepare AI attributes
        attrs_val = None
        if ai_attributes:
            attrs_val = json.dumps(ai_attributes)

        query = """
            INSERT INTO reports
                (type, title, description, category, location,
                 image_path, ai_attributes, embedding, contact_info)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        """
        params = (
            report_type,
            title.strip(),
            description.strip(),
            category,
            location.strip(),
            image_path,
            attrs_val,
            emb_bytes,
            contact_info.strip() if contact_info else None,
        )

        cur = _exec(conn, query, params)
        row = cur.fetchone()
        conn.commit()

        if isinstance(row, dict):
            return int(row["id"])
        elif hasattr(row, "__getitem__"):
            return int(row[0])
        return int(cur.lastrowid)
    finally:
        conn.close()


def get_report(report_id: int) -> dict | None:
    """Fetch a single report by id, deserialising JSON and embedding."""
    conn = get_connection()
    try:
        cur = _exec(conn, "SELECT * FROM reports WHERE id = ?", (report_id,))
        row = cur.fetchone()
        if row is None:
            return None
        return _row_to_report(row)
    finally:
        conn.close()


def get_reports(
    report_type: str | None = None,
    category: str | None = None,
    status: str = "active",
) -> list[dict]:
    """Fetch reports with optional filters."""
    query = "SELECT * FROM reports WHERE status = ?"
    params: list = [status]

    if report_type:
        query += " AND type = ?"
        params.append(report_type)
    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY created_at DESC"

    conn = get_connection()
    try:
        cur = _exec(conn, query, params)
        rows = cur.fetchall()
        return [_row_to_report(row) for row in rows]
    finally:
        conn.close()


def get_all_reports() -> list[dict]:
    """Fetch every report regardless of status, newest first."""
    conn = get_connection()
    try:
        cur = _exec(conn, "SELECT * FROM reports ORDER BY created_at DESC")
        rows = cur.fetchall()
        return [_row_to_report(row) for row in rows]
    finally:
        conn.close()


def update_report_status(report_id: int, status: str) -> None:
    """Update the status of a single report."""
    conn = get_connection()
    try:
        _exec(
            conn,
            "UPDATE reports SET status = ? WHERE id = ?",
            (status, report_id),
        )
        conn.commit()
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Match CRUD
# ---------------------------------------------------------------------------

def create_match(
    lost_report_id: int,
    found_report_id: int,
    similarity_score: float,
    embedding_score: float | None = None,
    attribute_score: float | None = None,
    location_score: float | None = None,
    explanation: str | None = None,
) -> int:
    """Insert a potential match record and return its id."""
    conn = get_connection()
    try:
        query = """
            INSERT INTO matches
                (lost_report_id, found_report_id, similarity_score,
                 embedding_score, attribute_score, location_score, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        """
        params = (
            lost_report_id,
            found_report_id,
            similarity_score,
            embedding_score,
            attribute_score,
            location_score,
            explanation,
        )
        cur = _exec(conn, query, params)
        row = cur.fetchone()
        conn.commit()

        if isinstance(row, dict):
            return int(row["id"])
        elif hasattr(row, "__getitem__"):
            return int(row[0])
        return int(cur.lastrowid)
    finally:
        conn.close()


def confirm_match(match_id: int) -> bool:
    """Atomically confirm a match: update the match record and both reports.

    Returns False if the found item already has a confirmed match (preventing
    a single found item from being confirmed against multiple lost reports).
    Uses a single transaction with row-level locks for atomicity.
    """
    conn = get_connection()
    try:
        if is_postgres():
            with conn.cursor() as cur:
                # 1. Fetch and lock the match record
                cur.execute("SELECT * FROM matches WHERE id = %s FOR UPDATE", (match_id,))
                match_row = cur.fetchone()
                if match_row is None:
                    return False

                lost_id = match_row["lost_report_id"]
                found_id = match_row["found_report_id"]

                # 2. Check if this found item already has a confirmed match
                cur.execute(
                    "SELECT id FROM matches WHERE found_report_id = %s AND status = 'confirmed' FOR UPDATE",
                    (found_id,),
                )
                if cur.fetchone() is not None:
                    return False

                # 3. Atomic updates
                now = datetime.utcnow()
                cur.execute(
                    "UPDATE matches SET status = 'confirmed', reviewed_at = %s WHERE id = %s",
                    (now, match_id),
                )
                cur.execute("UPDATE reports SET status = 'matched' WHERE id = %s", (lost_id,))
                cur.execute("UPDATE reports SET status = 'matched' WHERE id = %s", (found_id,))
            conn.commit()
            return True
        else:
            # SQLite transaction
            match_row = conn.execute(
                "SELECT * FROM matches WHERE id = ?", (match_id,)
            ).fetchone()
            if match_row is None:
                return False

            lost_id = match_row["lost_report_id"]
            found_id = match_row["found_report_id"]

            existing = conn.execute(
                """
                SELECT id FROM matches
                WHERE found_report_id = ? AND status = 'confirmed'
                """,
                (found_id,),
            ).fetchone()
            if existing is not None:
                return False

            now = datetime.utcnow().isoformat()
            conn.execute(
                "UPDATE matches SET status = 'confirmed', reviewed_at = ? WHERE id = ?",
                (now, match_id),
            )
            conn.execute(
                "UPDATE reports SET status = 'matched' WHERE id = ?", (lost_id,)
            )
            conn.execute(
                "UPDATE reports SET status = 'matched' WHERE id = ?", (found_id,)
            )
            conn.commit()
            return True
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def dismiss_match(match_id: int) -> None:
    """Mark a match as dismissed by the user."""
    conn = get_connection()
    try:
        now = datetime.utcnow() if is_postgres() else datetime.utcnow().isoformat()
        _exec(
            conn,
            "UPDATE matches SET status = 'dismissed', reviewed_at = ? WHERE id = ?",
            (now, match_id),
        )
        conn.commit()
    finally:
        conn.close()


def get_matches_for_report(report_id: int) -> list[dict]:
    """Get all pending/confirmed matches involving a given report."""
    conn = get_connection()
    try:
        query = """
            SELECT * FROM matches
            WHERE (lost_report_id = ? OR found_report_id = ?)
              AND status != 'dismissed'
            ORDER BY similarity_score DESC
        """
        cur = _exec(conn, query, (report_id, report_id))
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_match(match_id: int) -> dict | None:
    """Fetch a single match record by ID."""
    conn = get_connection()
    try:
        cur = _exec(conn, "SELECT * FROM matches WHERE id = ?", (match_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_match_between(lost_id: int, found_id: int) -> dict | None:
    """Fetch an existing match between a lost report and found report."""
    conn = get_connection()
    try:
        query = "SELECT * FROM matches WHERE lost_report_id = ? AND found_report_id = ?"
        cur = _exec(conn, query, (lost_id, found_id))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_all_matches(status: str | None = None) -> list[dict]:
    """Fetch all matches, optionally filtered by status ('pending', 'confirmed', 'dismissed')."""
    conn = get_connection()
    try:
        if status:
            cur = _exec(
                conn,
                "SELECT * FROM matches WHERE status = ? ORDER BY similarity_score DESC",
                (status,),
            )
        else:
            cur = _exec(conn, "SELECT * FROM matches ORDER BY similarity_score DESC")
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_match_statistics() -> dict:
    """Return aggregate statistics for the dashboard."""
    conn = get_connection()
    try:
        stats = {}

        def _get_val(cur):
            row = cur.fetchone()
            if row is None:
                return 0
            if isinstance(row, dict):
                return list(row.values())[0]
            return row[0]

        # Total reports by type
        for rtype in ("lost", "found"):
            cur = _exec(conn, "SELECT COUNT(*) FROM reports WHERE type = ?", (rtype,))
            stats[f"total_{rtype}"] = _get_val(cur)

        # Active reports
        cur = _exec(conn, "SELECT COUNT(*) FROM reports WHERE status = 'active'")
        stats["active_reports"] = _get_val(cur)

        # Matched reports
        cur = _exec(conn, "SELECT COUNT(*) FROM reports WHERE status = 'matched'")
        stats["matched_reports"] = _get_val(cur)

        # Match records by status
        for mstatus in ("pending", "confirmed", "dismissed"):
            cur = _exec(conn, "SELECT COUNT(*) FROM matches WHERE status = ?", (mstatus,))
            stats[f"matches_{mstatus}"] = _get_val(cur)

        return stats
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Internal Helpers
# ---------------------------------------------------------------------------

def _row_to_report(row) -> dict:
    """Convert a database row to a dict, deserialising stored fields."""
    report = dict(row)

    # Deserialise AI attributes JSON
    if report.get("ai_attributes"):
        attrs = report["ai_attributes"]
        if isinstance(attrs, str):
            try:
                report["ai_attributes"] = json.loads(attrs)
            except (json.JSONDecodeError, TypeError):
                report["ai_attributes"] = None
        elif isinstance(attrs, dict):
            report["ai_attributes"] = attrs
        else:
            report["ai_attributes"] = None

    # Reconstruct numpy embedding from bytes/buffer (supports float32 and float64)
    if report.get("embedding"):
        try:
            buf = bytes(report["embedding"])
            if len(buf) == 3072:  # 768 * 4 bytes (float32)
                report["embedding"] = np.frombuffer(buf, dtype=np.float32).astype(np.float64)
            else:  # 768 * 8 bytes (float64)
                report["embedding"] = np.frombuffer(buf, dtype=np.float64)
        except (ValueError, TypeError):
            report["embedding"] = None

    return report
