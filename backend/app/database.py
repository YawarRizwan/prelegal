"""SQLite connection and bootstrap."""

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "prelegal.db"


def get_connection() -> sqlite3.Connection:
    """Return a SQLite connection with row_factory set."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Bootstrap the database. Creates the file if absent."""
    conn = get_connection()
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.close()
