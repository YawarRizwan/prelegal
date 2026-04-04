"""Documents router — save and list completed documents."""

import json

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import list_documents, save_document

router = APIRouter(prefix="/documents", tags=["documents"])


class SaveDocumentRequest(BaseModel):
    session_id: str
    document_type: str
    title: str
    fields: dict[str, str | None]


@router.post("")
def save_doc(req: SaveDocumentRequest, user_id: str = Depends(get_current_user)) -> dict:
    doc_id = save_document(
        user_id=user_id,
        session_id=req.session_id,
        document_type=req.document_type,
        title=req.title,
        fields_json=json.dumps(req.fields),
    )
    return {"id": doc_id}


@router.get("")
def list_docs(user_id: str = Depends(get_current_user)) -> dict:
    docs = list_documents(user_id)
    return {
        "documents": [
            {
                "id": d["id"],
                "session_id": d["session_id"],
                "document_type": d["document_type"],
                "title": d["title"],
                "fields": json.loads(d["fields_json"]),
                "created_at": d["created_at"],
            }
            for d in docs
        ]
    }
