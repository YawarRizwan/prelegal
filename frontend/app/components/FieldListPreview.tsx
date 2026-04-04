"use client";

import React, { useState } from "react";
import { fetchTemplate } from "../lib/api";
import type { DocumentFields } from "../types/document";

interface Props {
  fields: DocumentFields;
  documentName: string;
  slug: string;
  onDownload?: () => void;
}

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Markdown → HTML converter
// ---------------------------------------------------------------------------

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Process inline markdown + make [brackets] into editable blanks. */
function inline(raw: string): string {
  // Keep existing HTML tags intact by processing around them
  let text = raw;
  // Bold
  text = text.replace(/\*\*([\s\S]*?)\*\*/g, "<strong>$1</strong>");
  // Markdown links [text](url) — keep as links, not editable
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Remaining [brackets] → editable blank
  text = text.replace(/\[([^\]]*)\]/g, (_m, inner) => {
    const safe = escapeHtml(inner);
    return `<span class="blank" contenteditable="true" spellcheck="false">[${safe}]</span>`;
  });
  return text;
}

function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inTable = false;
  let tableHasHeader = false;

  const closeTable = () => {
    if (inTable) { out.push("</table>"); inTable = false; tableHasHeader = false; }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Empty line
    if (!line.trim()) {
      closeTable();
      out.push("");
      continue;
    }

    // Table row
    if (line.trimStart().startsWith("|")) {
      if (!inTable) { out.push('<table class="doc-table">'); inTable = true; }
      // Separator row |---|---|
      if (/^\|[\s\-:| ]+\|/.test(line)) { tableHasHeader = true; continue; }
      const cells = line.split("|").slice(1, -1).map((c) => c.trim());
      const tag = !tableHasHeader ? "th" : "td";
      out.push(`<tr>${cells.map((c) => `<${tag}>${inline(c)}</${tag}>`).join("")}</tr>`);
      continue;
    }
    closeTable();

    // Headings
    const hm = line.match(/^(#{1,6})\s+(.*)/);
    if (hm) { out.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); continue; }

    // Checked checkbox
    if (/^- \[[xX]\] /.test(line)) {
      out.push(`<p class="cb"><span class="cb-icon cb-checked">☑</span> ${inline(line.slice(6))}</p>`);
      continue;
    }
    // Unchecked checkbox
    if (/^- \[ \] /.test(line)) {
      out.push(`<p class="cb"><span class="cb-icon">☐</span> ${inline(line.slice(6))}</p>`);
      continue;
    }

    // Lines that already contain HTML (numbered clauses, spans, etc.)
    if (/<[a-zA-Z]/.test(line)) {
      out.push(`<p class="legal">${inline(line)}</p>`);
      continue;
    }

    // Default paragraph
    out.push(`<p>${inline(line)}</p>`);
  }
  closeTable();
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Build the full document HTML
// ---------------------------------------------------------------------------

function buildDocumentHtml(
  templateMarkdown: string,
  fields: DocumentFields,
  documentName: string,
): string {
  const bodyHtml = mdToHtml(templateMarkdown);
  const collected = Object.entries(fields).filter(([, v]) => v !== null && v !== undefined && v !== "") as [string, string][];

  const fieldRows = collected
    .map(
      ([k, v]) =>
        `<tr><td class="fk">${escapeHtml(formatKey(k))}</td><td class="fv">${escapeHtml(v)}</td></tr>`,
    )
    .join("");

  const fieldsPanel = collected.length > 0
    ? `<div class="fields-panel no-print">
        <div class="fields-panel-title">Collected Fields (${collected.length})</div>
        <table class="fields-table"><tbody>${fieldRows}</tbody></table>
        <p class="fields-hint">Use these values to fill in the highlighted blanks in the document.</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${escapeHtml(documentName)} — DRAFT</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Georgia, "Times New Roman", serif; background: #f0f2f5; color: #1a1a1a; font-size: 13px; line-height: 1.75; }

    /* Toolbar */
    .toolbar { position: sticky; top: 0; z-index: 100; background: #032147; padding: 10px 24px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.18); }
    .toolbar-brand { color: #ecad0a; font-weight: 700; font-size: 16px; letter-spacing: -0.3px; margin-right: 4px; }
    .toolbar-brand span { color: #fff; }
    .print-btn { background: #753991; color: #fff; border: none; border-radius: 6px; padding: 7px 20px; font-size: 13px; font-weight: 600; cursor: pointer; margin-left: auto; }
    .print-btn:hover { background: #5e2e77; }
    .draft-badge { background: #fffbea; color: #7a6000; border: 1px solid #f0c040; border-radius: 4px; padding: 4px 10px; font-size: 11px; font-weight: 600; }

    /* Layout */
    .page { display: flex; gap: 20px; max-width: 1200px; margin: 24px auto; padding: 0 16px 48px; align-items: flex-start; }

    /* Fields panel */
    .fields-panel { width: 260px; flex-shrink: 0; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; position: sticky; top: 56px; }
    .fields-panel-title { font-family: -apple-system, sans-serif; font-size: 12px; font-weight: 700; color: #032147; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
    .fields-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .fields-table .fk { color: #888; font-family: -apple-system, sans-serif; padding: 4px 6px 4px 0; vertical-align: top; white-space: nowrap; font-weight: 600; }
    .fields-table .fv { color: #032147; padding: 4px 0; }
    .fields-hint { margin-top: 10px; font-family: -apple-system, sans-serif; font-size: 10px; color: #aaa; line-height: 1.4; }

    /* Document */
    .doc { flex: 1; background: #fff; border: 1px solid #e5e7eb; border-radius: 4px; padding: 48px 56px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 6px; margin-top: 24px; }
    h2 { font-size: 15px; font-weight: 700; margin: 20px 0 6px; }
    h3 { font-size: 13px; font-weight: 700; margin: 14px 0 4px; }
    h4, h5, h6 { font-size: 13px; font-weight: 600; margin: 10px 0 4px; }
    p { margin-bottom: 8px; }
    .legal { padding-left: 0; }
    a { color: #209dd7; }

    /* Editable blanks */
    .blank { background: #fff8dc; border-bottom: 2px solid #f0c040; border-radius: 2px; padding: 0 3px; cursor: text; min-width: 40px; display: inline-block; color: #7a6000; font-style: italic; }
    .blank:focus { outline: 2px solid #ecad0a; background: #fffbea; color: #1a1a1a; font-style: normal; }
    .blank:not(:empty):not([data-original="true"]) { color: #032147; font-style: normal; background: #e8f4fd; border-bottom-color: #209dd7; }

    /* Checkboxes */
    .cb { margin-bottom: 6px; }
    .cb-icon { font-size: 15px; margin-right: 6px; }
    .cb-checked { color: #209dd7; }

    /* Tables */
    .doc-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 12px; }
    .doc-table th, .doc-table td { border: 1px solid #ccc; padding: 7px 10px; text-align: left; }
    .doc-table th { background: #f7f8fa; font-weight: 600; }

    /* Span styling from templates */
    .keyterms_link { background: #f0f7ff; border-bottom: 1px dotted #209dd7; padding: 0 2px; border-radius: 2px; }
    .coverpage_link { background: #f0f7ff; border-bottom: 1px dotted #209dd7; padding: 0 2px; border-radius: 2px; }
    .orderform_link { background: #f0fff4; border-bottom: 1px dotted #27ae60; padding: 0 2px; border-radius: 2px; }
    .header_2 { font-weight: 700; font-size: 14px; }
    .header_3 { font-weight: 700; }
    label { font-size: 11px; color: #888; font-style: italic; display: block; margin-top: -4px; margin-bottom: 4px; }

    /* Disclaimer */
    .disclaimer { background: #fffbea; border: 1px solid #f0c040; border-radius: 6px; padding: 12px 16px; font-family: -apple-system, sans-serif; font-size: 11px; color: #7a6000; line-height: 1.6; margin-top: 32px; }

    /* Print */
    @media print {
      .no-print, .toolbar { display: none !important; }
      body { background: #fff; }
      .page { max-width: 100%; padding: 0; margin: 0; display: block; }
      .doc { border: none; padding: 0; border-radius: 0; }
      .blank { border-bottom: 1px solid #999; background: none; color: inherit; font-style: normal; }
      .blank:focus { outline: none; }
    }
  </style>
</head>
<body>

<div class="toolbar no-print">
  <span class="toolbar-brand">Pre<span>legal</span></span>
  <span class="draft-badge">DRAFT</span>
  <button class="print-btn" onclick="window.print()">Save as PDF / Print</button>
</div>

<div class="page">
  ${fieldsPanel}
  <div class="doc">
    ${bodyHtml}
    <div class="disclaimer">
      <strong>DRAFT DOCUMENT</strong> — This document is a draft generated by Prelegal for informational purposes only.
      It does not constitute legal advice. Please review with a qualified attorney before use.
      Yellow highlighted sections <span class="blank" style="pointer-events:none">[like this]</span> are fields that need to be filled in.
    </div>
  </div>
</div>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function FieldListPreview({ fields, documentName, slug, onDownload }: Props) {
  const [downloading, setDownloading] = useState(false);

  const collected = Object.entries(fields).filter(
    ([, v]) => v !== null && v !== undefined && v !== ""
  ) as [string, string][];
  const total = Object.keys(fields).length;
  const done = collected.length;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const templateMd = await fetchTemplate(slug);
      const html = templateMd
        ? buildDocumentHtml(templateMd, fields, documentName)
        : buildFallbackHtml(fields, documentName, collected);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      onDownload?.();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: "#fff" }}>
      {/* Header */}
      <div
        style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}
        className="px-4 py-3 flex-shrink-0 flex items-center justify-between"
      >
        <div>
          <p style={{ color: "#032147", fontWeight: 600, fontSize: 14 }}>{documentName}</p>
          <p style={{ color: "#888888", fontSize: 12 }}>
            {total > 0
              ? `${done} of ${total} fields collected`
              : "Chat to begin collecting fields"}
          </p>
        </div>
        {collected.length > 0 && (
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              background: downloading ? "#e5e7eb" : "#753991",
              color: downloading ? "#aaa" : "#fff",
              border: "none",
              borderRadius: 6,
              padding: "5px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: downloading ? "default" : "pointer",
            }}
          >
            {downloading ? "Loading..." : "Download"}
          </button>
        )}
      </div>

      {/* Draft disclaimer banner */}
      <div
        style={{
          background: "#fffbea",
          borderBottom: "1px solid #f0c040",
          padding: "8px 16px",
          fontSize: 11,
          color: "#7a6000",
          lineHeight: 1.5,
          flexShrink: 0,
        }}
      >
        <strong>DRAFT</strong> — This document is for review purposes only and is not legal advice.
        Please consult a qualified attorney before use.
      </div>

      {/* Field list */}
      <div className="flex-1 overflow-y-auto p-4">
        {collected.length === 0 ? (
          <p style={{ color: "#888888", fontSize: 13, textAlign: "center", marginTop: 48 }}>
            Fields will appear here as you chat with the assistant.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {collected.map(([key, value]) => (
              <div key={key} style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#888888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                  {formatKey(key)}
                </p>
                <p style={{ fontSize: 13, color: "#032147" }}>{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Fallback if template fetch fails
function buildFallbackHtml(
  fields: DocumentFields,
  documentName: string,
  collected: [string, string][],
): string {
  const rows = collected
    .map(
      ([key, value]) =>
        `<tr><td style="padding:10px 16px;font-weight:600;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;white-space:nowrap;border-bottom:1px solid #f0f0f0">${formatKey(key)}</td>
         <td style="padding:10px 16px;color:#032147;font-size:14px;border-bottom:1px solid #f0f0f0">${value}</td></tr>`,
    )
    .join("");
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><title>${documentName}</title>
  <style>body{font-family:Georgia,serif;background:#f9fafb;margin:0;padding:40px 24px}.card{background:#fff;max-width:720px;margin:0 auto;border-radius:8px;border:1px solid #e5e7eb;overflow:hidden}.header{background:#032147;padding:24px 32px}.header h1{color:#fff;margin:0;font-size:20px;font-weight:700}table{width:100%;border-collapse:collapse}.disclaimer{margin:16px 32px;padding:12px 16px;background:#fffbea;border:1px solid #f0c040;border-radius:6px;font-size:11px;color:#7a6000}.footer{padding:16px 32px;font-size:11px;color:#aaa;text-align:center;border-top:1px solid #f0f0f0}</style></head>
  <body><div class="card"><div class="header"><h1>${documentName}</h1></div><table>${rows}</table>
  <div class="disclaimer"><strong>DRAFT</strong> — Not legal advice. Review with a qualified attorney.</div>
  <div class="footer">Generated by Prelegal — use Ctrl+P / Cmd+P to save as PDF</div></div></body></html>`;
}
