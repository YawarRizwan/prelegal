"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Message } from "../types/nda";

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (text: string) => void;
}

export default function ChatPanel({ messages, loading, onSend }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    onSend(text);
  };

  return (
    <div className="flex flex-col h-full" style={{ borderRight: "1px solid #e5e7eb" }}>
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}
        className="px-4 py-3 flex-shrink-0"
      >
        <p style={{ color: "#032147", fontWeight: 600, fontSize: 14 }}>NDA Assistant</p>
        <p style={{ color: "#888888", fontSize: 12 }}>Mutual Non-Disclosure Agreement</p>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg, i) => (
            <div
              key={i}
              className="flex"
              style={{ justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "8px 12px",
                  borderRadius: 12,
                  fontSize: 13,
                  lineHeight: 1.5,
                  background: msg.role === "user" ? "#209dd7" : "#f3f4f6",
                  color: msg.role === "user" ? "#fff" : "#032147",
                  borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                  borderBottomLeftRadius: msg.role === "assistant" ? 4 : 12,
                }}
              >
                {msg.content}
              </div>
            </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex" style={{ justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                borderBottomLeftRadius: 4,
                background: "#f3f4f6",
                fontSize: 18,
                color: "#888",
                letterSpacing: 2,
              }}
              aria-label="Thinking..."
            >
              •••
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="flex-shrink-0 flex gap-2 p-3"
        style={{ borderTop: "1px solid #e5e7eb", background: "#fff" }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          disabled={loading}
          aria-label="Chat input"
          style={{
            flex: 1,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 13,
            outline: "none",
            color: "#032147",
          }}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          style={{
            background: loading || !input.trim() ? "#e5e7eb" : "#753991",
            color: loading || !input.trim() ? "#aaa" : "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading || !input.trim() ? "default" : "pointer",
            transition: "background 0.15s",
          }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
