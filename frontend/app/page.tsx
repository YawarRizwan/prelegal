"use client";

import React, { useCallback, useEffect, useState } from "react";
import ChatPanel from "./components/ChatPanel";
import NdaPreview from "./components/NdaPreview";
import { createSession, getSessionMessages, sendChatMessage } from "./lib/api";
import { emptyFields, mergeFields } from "./types/nda";
import type { Message, NdaFields } from "./types/nda";

const NAV_ITEMS = ["Dashboard", "Documents", "Templates", "Settings"];
const SESSION_KEY = "prelegal_session_id";
const FIELDS_KEY = "prelegal_fields";

function Sidebar() {
  return (
    <aside
      style={{ width: 220, minHeight: "100%", background: "#fff", borderRight: "1px solid #e5e7eb" }}
      className="flex-shrink-0 flex flex-col"
    >
      <div className="flex flex-col gap-1 p-4 pt-6">
        {NAV_ITEMS.map((item) => (
          <button
            key={item}
            disabled
            style={{ color: "#888888", cursor: "default" }}
            className="text-left px-3 py-2 rounded text-sm font-medium"
          >
            {item}
          </button>
        ))}
      </div>
      <div className="mt-auto p-4">
        <p style={{ color: "#888888" }} className="text-xs">
          V1 — coming soon
        </p>
      </div>
    </aside>
  );
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [fields, setFields] = useState<NdaFields>(emptyFields);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAiResponse = useCallback((reply: string, newFields: NdaFields) => {
    setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    setFields((prev) => {
      const merged = mergeFields(prev, newFields);
      try { localStorage.setItem(FIELDS_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      return merged;
    });
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      // Restore existing session
      setSessionId(stored);
      getSessionMessages(stored)
        .then((msgs) => {
          // Parse reply text from assistant JSON messages; skip __init__
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
          // Session gone — start fresh
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
        const id = await createSession();
        localStorage.setItem(SESSION_KEY, id);
        setSessionId(id);
        const res = await sendChatMessage(id, "__init__");
        handleAiResponse(res.reply, res.fields);
      } catch {
        setMessages([{ role: "assistant", content: "Unable to connect. Please refresh to try again." }]);
      } finally {
        setLoading(false);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = useCallback(async (text: string) => {
    if (!sessionId || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await sendChatMessage(sessionId, text);
      handleAiResponse(res.reply, res.fields);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, loading, handleAiResponse]);

  return (
    <div className="flex flex-col" style={{ height: "100vh", background: "#f9fafb" }}>
      {/* Top nav */}
      <header
        style={{ background: "#032147", height: 56 }}
        className="flex items-center px-6 flex-shrink-0"
      >
        <span style={{ color: "#ecad0a", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Pre</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>legal</span>
        <span
          style={{
            marginLeft: 12,
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
        <span style={{ marginLeft: "auto", color: "#fff", fontSize: 14, fontWeight: 500 }}>
          Mutual NDA Creator
        </span>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Two-panel main area */}
        <div className="flex flex-1 overflow-hidden">
          <div style={{ flex: 1 }} className="overflow-hidden">
            <ChatPanel messages={messages} loading={loading} onSend={handleSend} />
          </div>
          <div style={{ flex: 1 }} className="overflow-hidden">
            <NdaPreview fields={fields} />
          </div>
        </div>
      </div>
    </div>
  );
}
