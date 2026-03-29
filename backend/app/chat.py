"""Chat API router with LLM integration."""

import json
import os
import re
from pathlib import Path

import litellm
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException

from app.database import append_message, create_session, get_messages, session_exists
from app.models import ChatRequest, ChatResponse, NdaFields

load_dotenv(Path(__file__).parent.parent.parent / ".env")

router = APIRouter(prefix="/sessions", tags=["chat"])

SYSTEM_PROMPT = """You are a friendly legal assistant helping two parties draft a Mutual Non-Disclosure Agreement (MNDA).

Your job is to collect the required information through natural conversation, then populate the fields.

Fields to collect:
- Party 1: company name, signatory's full name, title, notice address (email or postal)
- Party 2: company name, signatory's full name, title, notice address
- Purpose: how Confidential Information may be used
- Effective date (format: YYYY-MM-DD; if user says "today", use today's date)
- MNDA term: number of years OR continues until terminated
- Term of confidentiality: number of years OR in perpetuity
- Governing law (US state)
- Jurisdiction (city/county and state, e.g. "courts located in New Castle, DE")
- Modifications to standard terms (optional — ask last)

Conversation rules:
- When you receive "__init__", greet the user warmly and ask for Party 1's company name
- Ask 1-2 questions at a time; be concise and professional
- Acknowledge each answer before asking the next question
- When all required fields are collected, congratulate the user and suggest downloading the document

You MUST respond with a JSON object in exactly this format:
{
  "reply": "your conversational message to the user",
  "fields": {
    "party1_company": null,
    "party1_name": null,
    "party1_title": null,
    "party1_address": null,
    "party2_company": null,
    "party2_name": null,
    "party2_title": null,
    "party2_address": null,
    "purpose": null,
    "effective_date": null,
    "mnda_term_type": null,
    "mnda_term_years": null,
    "confidentiality_term_type": null,
    "confidentiality_term_years": null,
    "governing_law": null,
    "jurisdiction": null,
    "modifications": null
  }
}

Critical rules:
- Include ALL 17 field keys in every response
- Use null for fields not yet collected — never invent values
- Carry forward all previously collected values (do not reset them to null)
- mnda_term_type must be "years" or "terminated" or null
- confidentiality_term_type must be "years" or "perpetuity" or null
- mnda_term_years and confidentiality_term_years must be integers or null
- effective_date must be YYYY-MM-DD or null
"""


def _parse_llm_content(content: str) -> tuple[str, NdaFields]:
    """Parse JSON from LLM response, handling markdown code blocks."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"```(?:json)?\s*([\s\S]*?)```", content)
        if match:
            data = json.loads(match.group(1).strip())
        else:
            raise ValueError(f"Cannot parse JSON from response: {content[:300]}")

    fields = NdaFields.model_validate(data.get("fields", {}))
    reply = data.get("reply", "")
    return reply, fields


def _call_llm(history: list[dict]) -> tuple[str, NdaFields]:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + history
    resp = litellm.completion(
        model="openrouter/openai/gpt-oss-120b",
        messages=messages,
        response_format={"type": "json_object"},
        api_key=os.environ["OPENROUTER_API_KEY"],
        api_base="https://openrouter.ai/api/v1",
        extra_body={"provider": {"order": ["Cerebras"]}},
    )
    content = resp.choices[0].message.content
    return _parse_llm_content(content)


@router.post("")
def create_session_route() -> dict:
    session_id = create_session()
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
    append_message(session_id, "user", req.text)
    history = get_messages(session_id)
    try:
        reply, fields = _call_llm(history)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    # Store full JSON so the LLM sees structured field context on future turns
    append_message(session_id, "assistant", json.dumps({"reply": reply, "fields": fields.model_dump()}))
    return ChatResponse(reply=reply, fields=fields)
