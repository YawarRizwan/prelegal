"use client";

import React from "react";

const NAV_ITEMS = ["Dashboard", "Documents", "Templates", "Settings"];

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
            className="text-left px-3 py-2 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
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

function PlaceholderCard({ title }: { title: string }) {
  return (
    <div
      style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "#fff" }}
      className="p-6"
    >
      <p style={{ color: "#032147" }} className="font-semibold text-sm mb-3">
        {title}
      </p>
      <div style={{ background: "#f3f4f6", borderRadius: 4, height: 80 }} />
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex flex-col" style={{ minHeight: "100vh", background: "#f9fafb" }}>
      {/* Top nav */}
      <header
        style={{ background: "#032147", height: 56 }}
        className="flex items-center px-6 flex-shrink-0"
      >
        <span style={{ color: "#ecad0a", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
          Pre
        </span>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 18, letterSpacing: "-0.5px" }}>
          legal
        </span>
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
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-8">
          <h1 style={{ color: "#032147" }} className="text-xl font-bold mb-1">
            Dashboard
          </h1>
          <p style={{ color: "#888888" }} className="text-sm mb-8">
            Your legal document workspace — full functionality coming soon.
          </p>

          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            <PlaceholderCard title="Recent Documents" />
            <PlaceholderCard title="Draft Agreements" />
            <PlaceholderCard title="Pending Signatures" />
            <PlaceholderCard title="Quick Actions" />
          </div>
        </main>
      </div>
    </div>
  );
}
