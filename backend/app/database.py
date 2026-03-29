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
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES sessions(id),
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );
        """)


def create_session() -> str:
    """Insert a new session row and return its UUID."""
    session_id = str(uuid.uuid4())
    with get_connection() as conn:
        conn.execute("INSERT INTO sessions (id) VALUES (?)", (session_id,))
    return session_id


def session_exists(session_id: str) -> bool:
    with get_connection() as conn:
        return conn.execute("SELECT 1 FROM sessions WHERE id = ?", (session_id,)).fetchone() is not None


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
