"""Tests for /documents API endpoints."""

import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


@pytest.fixture()
def client(tmp_path):
    db_file = tmp_path / "test.db"
    with patch("app.database.DB_PATH", db_file):
        from app.database import init_db
        init_db()
        # Re-patch for the app import
        with patch("app.database.DB_PATH", db_file):
            from app.main import app
            with TestClient(app) as c:
                yield c, db_file


def auth_headers(user_id: str = "user_test123") -> dict:
    """Return headers that bypass JWT verification."""
    return {"Authorization": "Bearer mock-token"}


def test_save_document_requires_auth(client):
    c, _ = client
    res = c.post("/documents", json={"session_id": "s", "document_type": "CSA", "title": "T", "fields": {}})
    assert res.status_code == 401


def test_list_documents_requires_auth(client):
    c, _ = client
    res = c.get("/documents")
    assert res.status_code == 401


def test_save_and_list_documents(tmp_path):
    db_file = tmp_path / "test.db"
    with patch("app.database.DB_PATH", db_file):
        from app.database import create_session, init_db
        init_db()
        sid = create_session("Mutual-NDA", user_id="user_test")

    with patch("app.database.DB_PATH", db_file), \
         patch("app.auth.verify_token", return_value="user_test"):
        from app.main import app
        with TestClient(app) as c:
            payload = {
                "session_id": sid,
                "document_type": "Mutual-NDA",
                "title": "NDA Test Doc",
                "fields": {"party1_name": "Alice", "party2_name": "Bob"},
            }
            res = c.post("/documents", json=payload, headers={"Authorization": "Bearer token"})
            assert res.status_code == 200
            doc_id = res.json()["id"]
            assert len(doc_id) == 36

            res2 = c.get("/documents", headers={"Authorization": "Bearer token"})
            assert res2.status_code == 200
            docs = res2.json()["documents"]
            assert len(docs) == 1
            assert docs[0]["title"] == "NDA Test Doc"
            assert docs[0]["fields"]["party1_name"] == "Alice"
