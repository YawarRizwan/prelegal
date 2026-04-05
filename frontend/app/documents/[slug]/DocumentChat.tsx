"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import ChatPanel from "../../components/ChatPanel";
import FieldListPreview from "../../components/FieldListPreview";
import { createSession, getSessionMessages, saveDocument, sendChatMessage } from "../../lib/api";
import { mergeFields } from "../../types/document";
import type { DocumentFields, Message } from "../../types/document";

interface Props {
  slug: string;
  documentName: string;
}

function buildTitle(documentName: string, fields: DocumentFields): string {
  const party1 = fields["party1_company"] ?? fields["party1_name"] ?? fields["customer_name"] ?? fields["client_name"] ?? "";
  const party2 = fields["party2_company"] ?? fields["party2_name"] ?? fields["provider_name"] ?? "";
  if (party1 && party2) return `${documentName} — ${party1} & ${party2}`;
  if (party1) return `${documentName} — ${party1}`;
  return documentName;
}

export default function DocumentChat({ slug, documentName }: Props) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [fields, setFields] = useState<DocumentFields>({});
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const SESSION_KEY = `prelegal_session_${slug}`;
  const FIELDS_KEY = `prelegal_fields_${slug}`;

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAiResponse = useCallback(
    (reply: string, newFields: DocumentFields) => {
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setFields((prev) => {
        const merged = mergeFields(prev, newFields);
        try {
          localStorage.setItem(FIELDS_KEY, JSON.stringify(merged));
        } catch { /* ignore */ }
        return merged;
      });
    },
    [FIELDS_KEY]
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      setSessionId(stored);
      getSessionMessages(stored)
        .then((msgs) => {
          const visible = msgs
            .filter((m) => m.content !== "__init__")
            .map((m) => {
              if (m.role === "assistant") {
                try {
                  const parsed = JSON.parse(m.content) as { reply?: string };
                  return { role: m.role, content: parsed.reply ?? m.content };
                } catch {
                  return m;
                }
              }
              return m;
            });
          setMessages(visible);
          const storedFields = localStorage.getItem(FIELDS_KEY);
          if (storedFields) setFields(JSON.parse(storedFields));
        })
        .catch(() => {
          localStorage.removeItem(SESSION_KEY);
          localStorage.removeItem(FIELDS_KEY);
          startSession();
        });
    } else {
      startSession();
    }

    async function startSession() {
      setLoading(true);
      try {
        const token = (await getToken()) ?? undefined;
        const id = await createSession(slug, token);
        localStorage.setItem(SESSION_KEY, id);
        setSessionId(id);
        const res = await sendChatMessage(id, "__init__", token);
        handleAiResponse(res.reply, res.fields);
      } catch {
        setMessages([
          { role: "assistant", content: "Unable to connect. Please refresh to try again." },
        ]);
      } finally {
        setLoading(false);
      }
    }
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(
    async (text: string) => {
      if (!sessionId || loading) return;
      setMessages((prev) => [...prev, { role: "user", content: text }]);
      setLoading(true);
      try {
        const token = (await getToken()) ?? undefined;
        const res = await sendChatMessage(sessionId, text, token);
        handleAiResponse(res.reply, res.fields);
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [sessionId, loading, handleAiResponse, getToken]
  );

  const handleDownload = useCallback(async () => {
    if (!sessionId) return;
    try {
      const token = await getToken();
      if (!token) return;
      const title = buildTitle(documentName, fields);
      await saveDocument(token, sessionId, slug, title, fields);
    } catch {
      // Save failure is non-blocking — user still gets their download
    }
  }, [sessionId, fields, documentName, slug, getToken]);

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#f9fafb" }}>
      {/* Top nav */}
      <header
        style={{ background: "#032147", height: 56 }}
        className="flex items-center px-6 flex-shrink-0 gap-2"
      >
        <button
          onClick={() => router.push("/")}
          style={{
            color: "#888",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            marginRight: 8,
            padding: "4px 8px",
            borderRadius: 4,
          }}
          aria-label="Back to documents"
        >
          ← Back
        </button>
        <span style={{ color: "#ecad0a", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
          Pre
        </span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px", marginLeft: -6 }}>
          legal
        </span>
        <span
          style={{
            marginLeft: 8,
            background: "#209dd7",
            color: "#fff",
            fontSize: 10,
            fontWeight: 600,
            padding: "2px 8px",
            borderRadius: 99,
            letterSpacing: "0.5px",
          }}
        >
          BETA
        </span>
        <span style={{ marginLeft: "auto", color: "#fff", fontSize: 14, fontWeight: 500, marginRight: 12 }}>
          {documentName}
        </span>
        <UserButton />
      </header>

      {/* Two-panel body */}
      <div className="flex flex-1 overflow-hidden">
        <div style={{ flex: "0 0 42%" }} className="overflow-hidden">
          <ChatPanel
            messages={messages}
            loading={loading}
            onSend={handleSend}
            title="Legal Assistant"
            subtitle={documentName}
          />
        </div>
        <div style={{ flex: 1 }} className="overflow-hidden">
          <FieldListPreview
            fields={fields}
            documentName={documentName}
            slug={slug}
            onDownload={handleDownload}
          />
        </div>
      </div>
    </div>
  );
}
