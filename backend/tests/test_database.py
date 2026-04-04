"""Tests for database.py — sessions and documents CRUD."""

import json
import os
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture()
def tmp_db(tmp_path):
    """Patch DB_PATH to a temp file, init, yield, teardown."""
    db_file = tmp_path / "test.db"
    with patch("app.database.DB_PATH", db_file):
        from app.database import init_db
        init_db()
        yield db_file


def test_create_and_session_exists(tmp_db):
    with patch("app.database.DB_PATH", tmp_db):
        from app.database import create_session, session_exists
        sid = create_session("Mutual-NDA")
        assert len(sid) == 36  # UUID format
        assert session_exists(sid) is True
        assert session_exists("nonexistent") is False


def test_create_session_stores_user_id(tmp_db):
    with patch("app.database.DB_PATH", tmp_db):
        from app.database import create_session, get_connection
        sid = create_session("CSA", user_id="user_abc123")
        with get_connection() as conn:
            row = conn.execute("SELECT user_id FROM sessions WHERE id=?", (sid,)).fetchone()
        assert row["user_id"] == "user_abc123"


def test_append_and_get_messages(tmp_db):
    with patch("app.database.DB_PATH", tmp_db):
        from app.database import append_message, create_session, get_messages
        sid = create_session("Mutual-NDA")
        append_message(sid, "user", "hello")
        append_message(sid, "assistant", '{"reply":"hi","fields":{}}')
        msgs = get_messages(sid)
        assert len(msgs) == 2
        assert msgs[0]["role"] == "user"
        assert msgs[1]["content"] == '{"reply":"hi","fields":{}}'


def test_save_and_list_documents(tmp_db):
    with patch("app.database.DB_PATH", tmp_db):
        from app.database import create_session, list_documents, save_document
        sid = create_session("Mutual-NDA", user_id="user_xyz")
        fields = {"party1_name": "Alice", "party2_name": "Bob"}
        doc_id = save_document(
            user_id="user_xyz",
            session_id=sid,
            document_type="Mutual-NDA",
            title="NDA — Alice & Bob",
            fields_json=json.dumps(fields),
        )
        assert len(doc_id) == 36
        docs = list_documents("user_xyz")
        assert len(docs) == 1
        assert docs[0]["title"] == "NDA — Alice & Bob"
        assert json.loads(docs[0]["fields_json"]) == fields


def test_list_documents_scoped_to_user(tmp_db):
    with patch("app.database.DB_PATH", tmp_db):
        from app.database import create_session, list_documents, save_document
        sid = create_session("CSA")
        save_document("user_a", sid, "CSA", "CSA Doc", '{"foo":"bar"}')
        save_document("user_b", sid, "CSA", "Other Doc", '{"x":"y"}')
        assert len(list_documents("user_a")) == 1
        assert len(list_documents("user_b")) == 1
        assert len(list_documents("user_c")) == 0
