"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { UserButton } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { listDocuments } from "../lib/api";
import { getSlug } from "../lib/catalog";
import type { SavedDocument } from "../lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function HistoryPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<SavedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push("/sign-in");
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await listDocuments(token);
        setDocs(data);
      } catch {
        setError("Failed to load your document history.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  const openDocument = (doc: SavedDocument) => {
    const slug = getSlug(doc.document_type + ".md") || doc.document_type;
    localStorage.setItem(`prelegal_session_${slug}`, doc.session_id);
    localStorage.setItem(`prelegal_fields_${slug}`, JSON.stringify(doc.fields));
    router.push(`/documents/${slug}`);
  };

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Nav */}
      <header
        style={{ background: "#032147", height: 56 }}
        className="flex items-center px-6 flex-shrink-0 gap-3"
      >
        <button
          onClick={() => router.push("/")}
          style={{ color: "#888", background: "none", border: "none", cursor: "pointer", fontSize: 13, padding: "4px 8px", borderRadius: 4 }}
        >
          ← Back
        </button>
        <span style={{ color: "#ecad0a", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>Pre</span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px", marginLeft: -10 }}>legal</span>
        <span style={{ flex: 1 }} />
        <UserButton />
      </header>

      <main className="flex-1 px-8 py-8" style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: "#032147", fontWeight: 700, fontSize: 22, marginBottom: 6 }}>My Documents</h1>
          <p style={{ color: "#888888", fontSize: 14 }}>Previously saved documents. Click to resume editing.</p>
        </div>

        {loading && <p style={{ color: "#888", fontSize: 14 }}>Loading...</p>}
        {error && <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>}

        {!loading && !error && docs.length === 0 && (
          <div
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "40px 24px",
              textAlign: "center",
              color: "#888",
              fontSize: 14,
            }}
          >
            No documents saved yet. Draft a document and click Download to save it here.
          </div>
        )}

        {docs.length > 0 && (
          <div className="flex flex-col gap-3">
            {docs.map((doc) => (
              <div
                key={doc.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 10,
                  padding: "16px 20px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  transition: "box-shadow 0.15s, border-color 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.08)";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#209dd7";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#032147", fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                    {doc.title}
                  </p>
                  <p style={{ color: "#888", fontSize: 12 }}>
                    {doc.document_type.replace(/-/g, " ")} &middot; Saved {formatDate(doc.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => openDocument(doc)}
                  style={{
                    background: "#753991",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "7px 16px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
