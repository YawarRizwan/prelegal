"""SQLite connection and bootstrap."""

import sqlite3
import uuid
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "prelegal.db"


@contextmanager
def get_connection():
    """Context manager yielding a SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Bootstrap the database. Creates tables if absent."""
    with get_connection() as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                document_type TEXT NOT NULL DEFAULT 'Mutual-NDA-coverpage',
                user_id TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id),
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                session_id TEXT REFERENCES sessions(id),
                document_type TEXT NOT NULL,
                title TEXT NOT NULL,
                fields_json TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)
        # Migrate existing DB: add missing columns
        session_cols = [row[1] for row in conn.execute("PRAGMA table_info(sessions)").fetchall()]
        if "document_type" not in session_cols:
            conn.execute(
                "ALTER TABLE sessions ADD COLUMN document_type TEXT NOT NULL DEFAULT 'Mutual-NDA-coverpage'"
            )
        if "user_id" not in session_cols:
            conn.execute("ALTER TABLE sessions ADD COLUMN user_id TEXT")


def create_session(document_type: str, user_id: str | None = None) -> str:
    """Insert a new session row and return its UUID."""
    session_id = str(uuid.uuid4())
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO sessions (id, document_type, user_id) VALUES (?, ?, ?)",
            (session_id, document_type, user_id),
        )
    return session_id


def session_exists(session_id: str) -> bool:
    with get_connection() as conn:
        return conn.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone() is not None


def get_session_document_type(session_id: str) -> str | None:
    with get_connection() as conn:
        row = conn.execute("SELECT document_type FROM sessions WHERE id = ?", (session_id,)).fetchone()
    return row["document_type"] if row else None


def get_messages(session_id: str) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT role, content FROM messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
    return [{"role": row["role"], "content": row["content"]} for row in rows]


def append_message(session_id: str, role: str, content: str) -> None:
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)",
            (session_id, role, content),
        )


def save_document(user_id: str, session_id: str, document_type: str, title: str, fields_json: str) -> str:
    """Save a completed document and return its ID."""
    doc_id = str(uuid.uuid4())
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO documents (id, user_id, session_id, document_type, title, fields_json) VALUES (?, ?, ?, ?, ?, ?)",
            (doc_id, user_id, session_id, document_type, title, fields_json),
        )
    return doc_id


def list_documents(user_id: str) -> list[dict]:
    """Return all documents for a user, newest first."""
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, session_id, document_type, title, fields_json, created_at FROM documents WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,),
        ).fetchall()
    return [dict(row) for row in rows]
