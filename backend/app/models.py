"""Pydantic models for the chat API."""

from typing import Literal, Optional

from pydantic import BaseModel


class NdaFields(BaseModel):
    party1_company: Optional[str] = None
    party1_name: Optional[str] = None
    party1_title: Optional[str] = None
    party1_address: Optional[str] = None
    party2_company: Optional[str] = None
    party2_name: Optional[str] = None
    party2_title: Optional[str] = None
    party2_address: Optional[str] = None
    purpose: Optional[str] = None
    effective_date: Optional[str] = None
    mnda_term_type: Optional[Literal["years", "terminated"]] = None
    mnda_term_years: Optional[int] = None
    confidentiality_term_type: Optional[Literal["years", "perpetuity"]] = None
    confidentiality_term_years: Optional[int] = None
    governing_law: Optional[str] = None
    jurisdiction: Optional[str] = None
    modifications: Optional[str] = None


class ChatRequest(BaseModel):
    text: str


class ChatResponse(BaseModel):
    reply: str
    fields: NdaFields
