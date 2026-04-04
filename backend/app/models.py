"""Pydantic models for the chat API."""

from pydantic import BaseModel


class CreateSessionRequest(BaseModel):
    document_type: str


class ChatRequest(BaseModel):
    text: str


class ChatResponse(BaseModel):
    reply: str
    fields: dict[str, str | None]
