"""Chat API router with LLM integration."""

import json
import os
import re
from pathlib import Path

import litellm
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_optional_user
from app.database import (
    append_message,
    create_session,
    get_messages,
    get_session_document_type,
    session_exists,
)
from app.models import ChatRequest, ChatResponse, CreateSessionRequest

load_dotenv(Path(__file__).parent.parent.parent / ".env")

router = APIRouter(prefix="/sessions", tags=["chat"])

TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"


def _load_template(document_type: str) -> str:
    path = TEMPLATES_DIR / f"{document_type}.md"
    if path.exists():
        return path.read_text(encoding="utf-8")[:4000]
    return ""


def _build_system_prompt(document_type: str) -> str:
    doc_name = document_type.replace("-", " ")
    template_content = _load_template(document_type)
    template_section = f"<template>\n{template_content}\n</template>\n\n" if template_content else ""

    return f"""You are a legal assistant helping a user draft a {doc_name}.

{template_section}Your task: collect the key fields needed to complete this document through natural conversation.

When you receive "__init__": greet the user, briefly name the document type, and ask for the first key piece of information (typically the parties' names or company names).

Rules:
- Ask 1-2 questions at a time; be concise and professional
- Acknowledge each answer before asking the next question
- Identify fields from the template structure (use snake_case keys, e.g. party1_company, effective_date, governing_law)
- When all key fields are collected, congratulate the user and suggest they review the document

Always respond with this exact JSON format:
{{
  "reply": "your conversational message to the user",
  "fields": {{
    "field_key": "collected value or null if not yet collected"
  }}
}}

Critical rules:
- Use null for uncollected fields — never invent values
- Carry forward all previously collected values — do not reset them to null
- Keep field keys consistent throughout the entire conversation
"""


def _parse_llm_content(content: str) -> tuple[str, dict]:
    """Parse JSON from LLM response, handling markdown code blocks and bare JSON."""
    if not content:
        raise ValueError("Empty response from LLM")

    content = content.strip().lstrip("\ufeff")

    # Direct parse
    try:
        data = json.loads(content)
        return data.get("reply", ""), data.get("fields", {})
    except json.JSONDecodeError:
        pass

    # Markdown code block
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
    if match:
        try:
            data = json.loads(match.group(1).strip())
            return data.get("reply", ""), data.get("fields", {})
        except json.JSONDecodeError:
            pass

    # Extract first {...} object from prose response
    match = re.search(r"\{[\s\S]*\}", content)
    if match:
        try:
            data = json.loads(match.group(0))
            return data.get("reply", ""), data.get("fields", {})
        except json.JSONDecodeError:
            pass

    raise ValueError(f"Cannot parse JSON from response: {content[:300]}")


def _call_llm(history: list[dict], system_prompt: str) -> tuple[str, dict]:
    messages = [{"role": "system", "content": system_prompt}] + history
    resp = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        messages=messages,
        response_format={"type": "json_object"},
        api_key=os.environ["OPENROUTER_API_KEY"],
        api_base="https://openrouter.ai/api/v1",
        extra_body={"provider": {"order": ["Cerebras"]}},
    )
    return _parse_llm_content(resp.choices[0].message.content or "")


@router.post("")
def create_session_route(req: CreateSessionRequest, user_id: str | None = Depends(get_optional_user)) -> dict:
    session_id = create_session(req.document_type, user_id)
    return {"session_id": session_id}


@router.get("/{session_id}/messages")
def get_session_messages(session_id: str) -> dict:
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"messages": get_messages(session_id)}


@router.post("/{session_id}/messages")
def send_message(session_id: str, req: ChatRequest) -> ChatResponse:
    if not session_exists(session_id):
        raise HTTPException(status_code=404, detail="Session not found")
    document_type = get_session_document_type(session_id) or "Mutual-NDA-coverpage"
    append_message(session_id, "user", req.text)
    history = get_messages(session_id)
    system_prompt = _build_system_prompt(document_type)
    try:
        reply, fields = _call_llm(history, system_prompt)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    append_message(session_id, "assistant", json.dumps({"reply": reply, "fields": fields}))
    return ChatResponse(reply=reply, fields=fields)
