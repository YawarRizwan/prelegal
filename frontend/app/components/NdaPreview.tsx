"use client";

import React, { useRef, useState } from "react";
import type { NdaFields } from "../types/nda";

interface Props {
  fields: NdaFields;
}

function Field({ value, placeholder }: { value: string | null; placeholder: string }) {
  if (value) return <span>{value}</span>;
  return <span style={{ color: "#bbb" }}>[{placeholder}]</span>;
}

export default function NdaPreview({ fields }: Props) {
  const docRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const handleDownload = async () => {
    if (!docRef.current || generating) return;
    setGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({ filename: "mutual-nda.pdf", jsPDF: { format: "a4", orientation: "portrait" } })
        .from(docRef.current)
        .save();
    } catch {
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const mndaByYears = fields.mnda_term_type === "years";
  const mndaTerminated = fields.mnda_term_type === "terminated";
  const mndaYears = fields.mnda_term_years ?? 1;
  const confByYears = fields.confidentiality_term_type === "years";
  const confPerpetual = fields.confidentiality_term_type === "perpetuity";
  const confYears = fields.confidentiality_term_years ?? 1;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}
      >
        <p style={{ color: "#032147", fontWeight: 600, fontSize: 14 }}>NDA Preview</p>
        <button
          onClick={handleDownload}
          disabled={generating}
          aria-busy={generating}
          style={{
            background: generating ? "#e5e7eb" : "#753991",
            color: generating ? "#aaa" : "#fff",
            border: "none",
            borderRadius: 6,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: generating ? "default" : "pointer",
          }}
        >
          {generating ? "Generating PDF…" : "Download as PDF"}
        </button>
      </div>

      {/* Document */}
      <div className="flex-1 overflow-y-auto p-6" style={{ background: "#f9fafb" }}>
        <div
          ref={docRef}
          className="nda-document"
          style={{
            background: "#fff",
            padding: "40px 48px",
            maxWidth: 680,
            margin: "0 auto",
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 13,
            lineHeight: 1.7,
            color: "#1a1a1a",
            border: "1px solid #e5e7eb",
            borderRadius: 4,
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>
            Mutual Non-Disclosure Agreement
          </h1>
          <h2 style={{ fontSize: 14, fontWeight: 600, textAlign: "center", marginBottom: 20, color: "#555" }}>
            Cover Page
          </h2>

          <p style={{ fontSize: 12, color: "#555", marginBottom: 20, lineHeight: 1.6 }}>
            This Mutual Non-Disclosure Agreement (the &ldquo;MNDA&rdquo;) consists of: (1) this Cover Page and (2)
            the Common Paper Mutual NDA Standard Terms Version 1.0. Any modifications of the Standard Terms
            should be made on the Cover Page, which will control over conflicts with the Standard Terms.
          </p>

          {/* Purpose */}
          <section style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Purpose</p>
            <p style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>How Confidential Information may be used</p>
            <p>
              <Field
                value={fields.purpose}
                placeholder="Evaluating whether to enter into a business relationship with the other party."
              />
            </p>
          </section>

          {/* Effective Date */}
          <section style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Effective Date</p>
            <p>
              <Field value={fields.effective_date} placeholder="Effective Date" />
            </p>
          </section>

          {/* MNDA Term */}
          <section style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>MNDA Term</p>
            <p style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>The length of this MNDA</p>
            <p style={{ marginBottom: 4 }}>
              <span style={{ marginRight: 8 }}>{mndaByYears ? "[x]" : "[ ]"}</span>
              Expires <strong>{mndaYears} year(s)</strong> from Effective Date.
            </p>
            <p>
              <span style={{ marginRight: 8 }}>{mndaTerminated ? "[x]" : "[ ]"}</span>
              Continues until terminated in accordance with the terms of the MNDA.
            </p>
          </section>

          {/* Term of Confidentiality */}
          <section style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Term of Confidentiality</p>
            <p style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>How long Confidential Information is protected</p>
            <p style={{ marginBottom: 4 }}>
              <span style={{ marginRight: 8 }}>{confByYears ? "[x]" : "[ ]"}</span>
              <strong>{confYears} year(s)</strong> from Effective Date, but in the case of trade secrets until
              Confidential Information is no longer considered a trade secret under applicable laws.
            </p>
            <p>
              <span style={{ marginRight: 8 }}>{confPerpetual ? "[x]" : "[ ]"}</span>
              In perpetuity.
            </p>
          </section>

          {/* Governing Law & Jurisdiction */}
          <section style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Governing Law &amp; Jurisdiction</p>
            <p>
              Governing Law:{" "}
              <Field value={fields.governing_law} placeholder="Fill in state" />
            </p>
            <p>
              Jurisdiction:{" "}
              <Field value={fields.jurisdiction} placeholder='Fill in city or county and state, e.g. "courts located in New Castle, DE"' />
            </p>
          </section>

          {/* Modifications */}
          {fields.modifications && (
            <section style={{ marginBottom: 16 }}>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>MNDA Modifications</p>
              <p>{fields.modifications}</p>
            </section>
          )}

          <p style={{ marginBottom: 20, fontStyle: "italic", fontSize: 12 }}>
            By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
          </p>

          {/* Signature table */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                <td style={{ width: "34%", padding: "6px 8px", border: "1px solid #ccc" }} />
                <th style={{ padding: "6px 8px", border: "1px solid #ccc", fontWeight: 600, textAlign: "center" }}>
                  Party 1
                </th>
                <th style={{ padding: "6px 8px", border: "1px solid #ccc", fontWeight: 600, textAlign: "center" }}>
                  Party 2
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: "Signature", v1: null, v2: null },
                { label: "Print Name", v1: fields.party1_name, v2: fields.party2_name },
                { label: "Title", v1: fields.party1_title, v2: fields.party2_title },
                { label: "Company", v1: fields.party1_company, v2: fields.party2_company },
                { label: "Notice Address", v1: fields.party1_address, v2: fields.party2_address },
                { label: "Date", v1: fields.effective_date, v2: fields.effective_date },
              ].map(({ label, v1, v2 }) => (
                <tr key={label}>
                  <td style={{ padding: "6px 8px", border: "1px solid #ccc", fontWeight: 500 }}>{label}</td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ccc", color: v1 ? "#1a1a1a" : "#bbb" }}>
                    {v1 ?? ""}
                  </td>
                  <td style={{ padding: "6px 8px", border: "1px solid #ccc", color: v2 ? "#1a1a1a" : "#bbb" }}>
                    {v2 ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p style={{ marginTop: 20, fontSize: 11, color: "#888", textAlign: "center" }}>
            Common Paper Mutual Non-Disclosure Agreement (Version 1.0) — free to use under CC BY 4.0
          </p>
        </div>
      </div>
    </div>
  );
}
