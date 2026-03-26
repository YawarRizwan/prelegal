"use client";

import React, { useState, useId } from "react";


interface Party {
  printName: string;
  title: string;
  company: string;
  noticeAddress: string;
}

interface FormData {
  purpose: string;
  effectiveDate: string;
  mndaTermYears: string;
  mndaTermType: "years" | "until_terminated";
  confidentialityTermYears: string;
  confidentialityTermType: "years" | "perpetuity";
  governingLaw: string;
  jurisdiction: string;
  modifications: string;
  party1: Party;
  party2: Party;
}

const defaultParty: Party = { printName: "", title: "", company: "", noticeAddress: "" };

const defaults: FormData = {
  purpose: "Evaluating whether to enter into a business relationship with the other party.",
  effectiveDate: new Date().toISOString().split("T")[0],
  mndaTermYears: "1",
  mndaTermType: "years",
  confidentialityTermYears: "1",
  confidentialityTermType: "years",
  governingLaw: "",
  jurisdiction: "",
  modifications: "",
  party1: { ...defaultParty },
  party2: { ...defaultParty },
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const id = useId();
  // Only clone the first React element child (the primary control) with the generated id.
  // Secondary children (e.g. conditional year inputs, radio groups) are left untouched.
  let firstCloned = false;
  const enhancedChildren = React.Children.map(children, (child) => {
    if (!firstCloned && React.isValidElement(child)) {
      firstCloned = true;
      return React.cloneElement(child as React.ReactElement<{ id?: string }>, { id });
    }
    return child;
  });
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {enhancedChildren}
    </div>
  );
}

const inputCls = "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
const textareaCls = inputCls + " resize-none";

function PartyFields({ title, value, onChange }: { title: string; value: Party; onChange: (p: Party) => void }) {
  const set = (k: keyof Party) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    onChange({ ...value, [k]: e.target.value });
  return (
    <div className="border border-gray-200 rounded p-3 mb-4">
      <h3 className="font-semibold text-sm text-gray-700 mb-3">{title}</h3>
      <Field label="Print Name"><input className={inputCls} value={value.printName} onChange={set("printName")} placeholder="Full name" /></Field>
      <Field label="Title"><input className={inputCls} value={value.title} onChange={set("title")} placeholder="Job title" /></Field>
      <Field label="Company"><input className={inputCls} value={value.company} onChange={set("company")} placeholder="Company name" /></Field>
      <Field label="Notice Address"><textarea className={textareaCls} rows={2} value={value.noticeAddress} onChange={set("noticeAddress")} placeholder="Email or postal address" /></Field>
    </div>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormData>(defaults);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  const set = <K extends keyof FormData>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: (e.target as HTMLInputElement).value }));

  async function downloadAsPdf() {
    if (isPdfGenerating) return;
    const element = document.querySelector(".nda-document") as HTMLElement;
    if (!element) return;
    setIsPdfGenerating(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      await html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: "mutual-nda.pdf",
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(element)
        .save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsPdfGenerating(false);
    }
  }

  const mndaTerm = form.mndaTermType === "years"
    ? `Expires ${form.mndaTermYears.trim() || "1"} year(s) from Effective Date.`
    : "Continues until terminated in accordance with the terms of the MNDA.";

  const confidentialityTerm = form.confidentialityTermType === "years"
    ? `${form.confidentialityTermYears.trim() || "1"} year(s) from Effective Date, but in the case of trade secrets until Confidential Information is no longer considered a trade secret under applicable laws.`
    : "In perpetuity.";

  const purpose = form.purpose.trim() || "Evaluating whether to enter into a business relationship with the other party.";
  const effectiveDate = form.effectiveDate || "________________";
  const governingLaw = form.governingLaw.trim() || "[Governing Law]";
  const jurisdiction = form.jurisdiction.trim() || "[Jurisdiction]";

  const standardTerms = [
    {
      num: "1", title: "Introduction",
      body: `This Mutual Non-Disclosure Agreement (which incorporates these Standard Terms and the Cover Page (defined below)) ("MNDA") allows each party ("Disclosing Party") to disclose or make available information in connection with the ${purpose} which (1) the Disclosing Party identifies to the receiving party ("Receiving Party") as "confidential", "proprietary", or the like or (2) should be reasonably understood as confidential or proprietary due to its nature and the circumstances of its disclosure ("Confidential Information"). Each party's Confidential Information also includes the existence and status of the parties' discussions and information on the Cover Page. Confidential Information includes technical or business information, product designs or roadmaps, requirements, pricing, security and compliance documentation, technology, inventions and know-how. To use this MNDA, the parties must complete and sign a cover page incorporating these Standard Terms ("Cover Page"). Each party is identified on the Cover Page and capitalized terms have the meanings given herein or on the Cover Page.`
    },
    {
      num: "2", title: "Use and Protection of Confidential Information",
      body: `The Receiving Party shall: (a) use Confidential Information solely for the ${purpose}; (b) not disclose Confidential Information to third parties without the Disclosing Party's prior written approval, except that the Receiving Party may disclose Confidential Information to its employees, agents, advisors, contractors and other representatives having a reasonable need to know for the ${purpose}, provided these representatives are bound by confidentiality obligations no less protective of the Disclosing Party than the applicable terms in this MNDA and the Receiving Party remains responsible for their compliance with this MNDA; and (c) protect Confidential Information using at least the same protections the Receiving Party uses for its own similar information but no less than a reasonable standard of care.`
    },
    {
      num: "3", title: "Exceptions",
      body: `The Receiving Party's obligations in this MNDA do not apply to information that it can demonstrate: (a) is or becomes publicly available through no fault of the Receiving Party; (b) it rightfully knew or possessed prior to receipt from the Disclosing Party without confidentiality restrictions; (c) it rightfully obtained from a third party without confidentiality restrictions; or (d) it independently developed without using or referencing the Confidential Information.`
    },
    {
      num: "4", title: "Disclosures Required by Law",
      body: `The Receiving Party may disclose Confidential Information to the extent required by law, regulation or regulatory authority, subpoena or court order, provided (to the extent legally permitted) it provides the Disclosing Party reasonable advance notice of the required disclosure and reasonably cooperates, at the Disclosing Party's expense, with the Disclosing Party's efforts to obtain confidential treatment for the Confidential Information.`
    },
    {
      num: "5", title: "Term and Termination",
      body: `This MNDA commences on the ${effectiveDate} and expires at the end of the MNDA Term (${mndaTerm}). Either party may terminate this MNDA for any or no reason upon written notice to the other party. The Receiving Party's obligations relating to Confidential Information will survive for the Term of Confidentiality (${confidentialityTerm}), despite any expiration or termination of this MNDA.`
    },
    {
      num: "6", title: "Return or Destruction of Confidential Information",
      body: `Upon expiration or termination of this MNDA or upon the Disclosing Party's earlier request, the Receiving Party will: (a) cease using Confidential Information; (b) promptly after the Disclosing Party's written request, destroy all Confidential Information in the Receiving Party's possession or control or return it to the Disclosing Party; and (c) if requested by the Disclosing Party, confirm its compliance with these obligations in writing. As an exception to subsection (b), the Receiving Party may retain Confidential Information in accordance with its standard backup or record retention policies or as required by law, but the terms of this MNDA will continue to apply to the retained Confidential Information.`
    },
    {
      num: "7", title: "Proprietary Rights",
      body: `The Disclosing Party retains all of its intellectual property and other rights in its Confidential Information and its disclosure to the Receiving Party grants no license under such rights.`
    },
    {
      num: "8", title: "Disclaimer",
      body: `ALL CONFIDENTIAL INFORMATION IS PROVIDED "AS IS", WITH ALL FAULTS, AND WITHOUT WARRANTIES, INCLUDING THE IMPLIED WARRANTIES OF TITLE, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.`
    },
    {
      num: "9", title: "Governing Law and Jurisdiction",
      body: `This MNDA and all matters relating hereto are governed by, and construed in accordance with, the laws of the State of ${governingLaw}, without regard to the conflict of laws provisions of such ${governingLaw}. Any legal suit, action, or proceeding relating to this MNDA must be instituted in the federal or state courts located in ${jurisdiction}. Each party irrevocably submits to the exclusive jurisdiction of such ${jurisdiction} in any such suit, action, or proceeding.`
    },
    {
      num: "10", title: "Equitable Relief",
      body: `A breach of this MNDA may cause irreparable harm for which monetary damages are an insufficient remedy. Upon a breach of this MNDA, the Disclosing Party is entitled to seek appropriate equitable relief, including an injunction, in addition to its other remedies.`
    },
    {
      num: "11", title: "General",
      body: `Neither party has an obligation under this MNDA to disclose Confidential Information to the other or proceed with any proposed transaction. Neither party may assign this MNDA without the prior written consent of the other party, except that either party may assign this MNDA in connection with a merger, reorganization, acquisition or other transfer of all or substantially all its assets or voting securities. Any assignment in violation of this Section is null and void. This MNDA will bind and inure to the benefit of each party's permitted successors and assigns. Waivers must be signed by the waiving party's authorized representative and cannot be implied from conduct. If any provision of this MNDA is held unenforceable, it will be limited to the minimum extent necessary so the rest of this MNDA remains in effect. This MNDA (including the Cover Page) constitutes the entire agreement of the parties with respect to its subject matter, and supersedes all prior and contemporaneous understandings, agreements, representations, and warranties, whether written or oral, regarding such subject matter. This MNDA may only be amended, modified, waived, or supplemented by an agreement in writing signed by both parties. Notices, requests and approvals under this MNDA must be sent in writing to the email or postal addresses on the Cover Page and are deemed delivered on receipt. This MNDA may be executed in counterparts, including electronic copies, each of which is deemed an original and which together form the same agreement.`
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 no-print">
        <h1 className="text-xl font-bold text-gray-900">Mutual NDA Creator</h1>
        <p className="text-sm text-gray-500">Fill in the form to generate your Mutual Non-Disclosure Agreement</p>
      </header>

      <div className="layout-shell flex flex-col lg:flex-row gap-0 h-[calc(100vh-73px)]">
        {/* Form panel */}
        <aside className="no-print w-full lg:w-96 bg-white border-r border-gray-200 overflow-y-auto p-5 flex-shrink-0">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">Agreement Details</h2>

          <Field label="Purpose">
            <textarea className={textareaCls} rows={3} value={form.purpose} onChange={set("purpose")} />
          </Field>

          <Field label="Effective Date">
            <input type="date" className={inputCls} value={form.effectiveDate} onChange={set("effectiveDate")} />
          </Field>

          <Field label="MNDA Term">
            <div className="flex gap-3 mb-2 text-sm">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={form.mndaTermType === "years"} onChange={() => setForm(f => ({ ...f, mndaTermType: "years" }))} />
                Expires after
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={form.mndaTermType === "until_terminated"} onChange={() => setForm(f => ({ ...f, mndaTermType: "until_terminated" }))} />
                Until terminated
              </label>
            </div>
            {form.mndaTermType === "years" && (
              <input type="number" min="1" className={inputCls} value={form.mndaTermYears} onChange={set("mndaTermYears")} placeholder="Years" />
            )}
          </Field>

          <Field label="Term of Confidentiality">
            <div className="flex gap-3 mb-2 text-sm">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={form.confidentialityTermType === "years"} onChange={() => setForm(f => ({ ...f, confidentialityTermType: "years" }))} />
                Years
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={form.confidentialityTermType === "perpetuity"} onChange={() => setForm(f => ({ ...f, confidentialityTermType: "perpetuity" }))} />
                In perpetuity
              </label>
            </div>
            {form.confidentialityTermType === "years" && (
              <input type="number" min="1" className={inputCls} value={form.confidentialityTermYears} onChange={set("confidentialityTermYears")} placeholder="Years" />
            )}
          </Field>

          <Field label="Governing Law (State)">
            <input className={inputCls} value={form.governingLaw} onChange={set("governingLaw")} placeholder="e.g. Delaware" />
          </Field>

          <Field label="Jurisdiction">
            <input className={inputCls} value={form.jurisdiction} onChange={set("jurisdiction")} placeholder="e.g. courts located in New Castle, DE" />
          </Field>

          <Field label="MNDA Modifications (optional)">
            <textarea className={textareaCls} rows={2} value={form.modifications} onChange={set("modifications")} placeholder="Any modifications to the standard terms" />
          </Field>

          <PartyFields title="Party 1" value={form.party1} onChange={p => setForm(f => ({ ...f, party1: p }))} />
          <PartyFields title="Party 2" value={form.party2} onChange={p => setForm(f => ({ ...f, party2: p }))} />

          <button
            onClick={downloadAsPdf}
            disabled={isPdfGenerating}
            aria-busy={isPdfGenerating}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            {isPdfGenerating ? "Generating PDF…" : "Download as PDF"}
          </button>
        </aside>

        {/* Preview panel */}
        <main className="flex-1 overflow-y-auto bg-gray-100 p-6">
          <div className="nda-document max-w-3xl mx-auto bg-white shadow-sm rounded p-10 text-sm leading-relaxed">
            {/* Cover Page */}
            <h1 className="text-2xl font-bold text-center mb-2">Mutual Non-Disclosure Agreement</h1>
            <p className="text-center text-gray-500 text-xs mb-8">
              Common Paper Mutual NDA Standard Terms Version 1.0
            </p>

            <section className="mb-6">
              <h2 className="font-bold text-base border-b border-gray-300 pb-1 mb-3">Cover Page</h2>

              <div className="mb-4">
                <p className="font-semibold">Purpose</p>
                <p className="text-gray-500 text-xs italic mb-1">How Confidential Information may be used</p>
                <p>{purpose}</p>
              </div>

              <div className="mb-4">
                <p className="font-semibold">Effective Date</p>
                <p>{effectiveDate}</p>
              </div>

              <div className="mb-4">
                <p className="font-semibold">MNDA Term</p>
                <p>{mndaTerm}</p>
              </div>

              <div className="mb-4">
                <p className="font-semibold">Term of Confidentiality</p>
                <p>{confidentialityTerm}</p>
              </div>

              <div className="mb-4">
                <p className="font-semibold">Governing Law & Jurisdiction</p>
                <p>Governing Law: {governingLaw}</p>
                <p>Jurisdiction: {jurisdiction}</p>
              </div>

              {form.modifications.trim() && (
                <div className="mb-4">
                  <p className="font-semibold">MNDA Modifications</p>
                  <p>{form.modifications}</p>
                </div>
              )}

              {/* Signature table */}
              <div className="mt-6">
                <p className="text-xs text-gray-500 mb-3">By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.</p>
                <table className="w-full border border-gray-300 text-xs">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-3 py-2 text-left w-32"></th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Party 1</th>
                      <th className="border border-gray-300 px-3 py-2 text-center">Party 2</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Signature", "", ""],
                      ["Print Name", form.party1.printName, form.party2.printName],
                      ["Title", form.party1.title, form.party2.title],
                      ["Company", form.party1.company, form.party2.company],
                      ["Notice Address", form.party1.noticeAddress, form.party2.noticeAddress],
                      ["Date", effectiveDate, effectiveDate],
                    ].map(([label, v1, v2]) => (
                      <tr key={label}>
                        <td className="border border-gray-300 px-3 py-2 font-medium bg-gray-50">{label}</td>
                        <td className="border border-gray-300 px-3 py-3">{v1}</td>
                        <td className="border border-gray-300 px-3 py-3">{v2}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Standard Terms */}
            <section>
              <h2 className="font-bold text-base border-b border-gray-300 pb-1 mb-4">Standard Terms</h2>
              {standardTerms.map(t => (
                <div key={t.num} className="mb-4">
                  <p>
                    <strong>{t.num}. {t.title}.</strong>{" "}
                    {t.body}
                  </p>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-6">
                Common Paper Mutual Non-Disclosure Agreement Version 1.0 free to use under CC BY 4.0.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
