import type { DocumentFields, Message } from "../types/document";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeaders(token?: string): HeadersInit {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

export async function createSession(documentType: string, token?: string): Promise<string> {
  const res = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ document_type: documentType }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  const data = await res.json();
  return data.session_id as string;
}

export async function getSessionMessages(sessionId: string): Promise<Message[]> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
  if (!res.ok) throw new Error("Session not found");
  const data = await res.json();
  return data.messages as Message[];
}

export async function sendChatMessage(
  sessionId: string,
  text: string,
  token?: string,
): Promise<{ reply: string; fields: DocumentFields }> {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { detail?: string }).detail ?? "Failed to send message");
  }
  return res.json() as Promise<{ reply: string; fields: DocumentFields }>;
}

export async function saveDocument(
  token: string,
  sessionId: string,
  documentType: string,
  title: string,
  fields: DocumentFields,
): Promise<string> {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify({ session_id: sessionId, document_type: documentType, title, fields }),
  });
  if (!res.ok) throw new Error("Failed to save document");
  const data = await res.json();
  return data.id as string;
}

export interface SavedDocument {
  id: string;
  session_id: string;
  document_type: string;
  title: string;
  fields: DocumentFields;
  created_at: string;
}

export async function listDocuments(token: string): Promise<SavedDocument[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to load history");
  const data = await res.json();
  return data.documents as SavedDocument[];
}
