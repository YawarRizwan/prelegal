"use client";

import React, { useEffect } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useRouter } from "next/navigation";
import { catalog, getSlug } from "./lib/catalog";
import type { CatalogEntry } from "./lib/catalog";

function DocumentCard({ entry }: { entry: CatalogEntry }) {
  const router = useRouter();
  const slug = getSlug(entry.filename);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 10,
        padding: "20px 24px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "box-shadow 0.15s, border-color 0.15s",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.09)";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#209dd7";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
      }}
    >
      <p style={{ color: "#032147", fontWeight: 600, fontSize: 14, lineHeight: 1.3 }}>
        {entry.name}
      </p>
      <p style={{ color: "#888888", fontSize: 12, lineHeight: 1.6, flex: 1 }}>
        {entry.description}
      </p>
      <button
        onClick={() => router.push(`/documents/${slug}`)}
        style={{
          marginTop: 4,
          background: "#753991",
          color: "#fff",
          border: "none",
          borderRadius: 6,
          padding: "7px 16px",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        Draft
      </button>
    </div>
  );
}

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isLoaded || !isSignedIn) return null;

  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Top nav */}
      <header
        style={{ background: "#032147", height: 56 }}
        className="flex items-center px-6 flex-shrink-0 gap-3"
      >
        <span style={{ color: "#ecad0a", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
          Pre
        </span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px", marginLeft: -10 }}>
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
        <span style={{ flex: 1 }} />
        <button
          onClick={() => router.push("/history")}
          style={{
            color: "#ccc",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
            marginRight: 8,
          }}
        >
          My Documents
        </button>
        <UserButton />
      </header>

      {/* Hero */}
      <div style={{ background: "#032147", borderBottom: "1px solid #0a3570", paddingBottom: 32 }}>
        <div className="px-8 pt-10" style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h1 style={{ color: "#fff", fontWeight: 700, fontSize: 28, marginBottom: 8, lineHeight: 1.2 }}>
            Draft legal documents<br />
            <span style={{ color: "#ecad0a" }}>faster, with AI.</span>
          </h1>
          <p style={{ color: "#8eadd4", fontSize: 15, maxWidth: 520, lineHeight: 1.6 }}>
            Answer a few questions and get a professionally structured draft in minutes.
            All documents are generated as drafts for attorney review.
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-8 py-8" style={{ maxWidth: 1100, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ color: "#032147", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>
            Available Documents
          </h2>
          <p style={{ color: "#888888", fontSize: 14 }}>
            Select a document type to begin drafting with AI assistance.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          {catalog.map((entry) => (
            <DocumentCard key={entry.filename} entry={entry} />
          ))}
        </div>
      </main>
    </div>
  );
}
