export interface CatalogEntry {
  name: string;
  description: string;
  filename: string;
}

export const catalog: CatalogEntry[] = [
  {
    name: "Mutual Non-Disclosure Agreement",
    description: "A standard mutual NDA that allows two parties to share confidential information for a specific purpose while protecting each party's proprietary information.",
    filename: "Mutual-NDA.md",
  },
  {
    name: "Mutual NDA Cover Page",
    description: "The cover page template to be used with the Common Paper Mutual NDA Standard Terms. Parties fill in the purpose, effective date, term, governing law, and signatures.",
    filename: "Mutual-NDA-coverpage.md",
  },
  {
    name: "Cloud Service Agreement",
    description: "A comprehensive agreement for selling and buying cloud software and SaaS products, covering access and use rights, restrictions, privacy, payment, term, warranties, liability, indemnification, and confidentiality.",
    filename: "CSA.md",
  },
  {
    name: "Design Partner Agreement",
    description: "A standard agreement for early-access design partner programs, where a partner gains early use of a product in exchange for providing feedback to help the provider develop and improve the product.",
    filename: "design-partner-agreement.md",
  },
  {
    name: "Service Level Agreement",
    description: "An SLA defining uptime targets, response time targets, and service credits available if those targets are not met. Includes termination rights for repeated failures.",
    filename: "sla.md",
  },
  {
    name: "Professional Services Agreement",
    description: "A standard agreement for engaging professional services, covering statements of work, IP ownership of deliverables, payment, confidentiality, and liability.",
    filename: "psa.md",
  },
  {
    name: "Data Processing Agreement",
    description: "A GDPR-compliant data processing agreement governing how a provider processes personal data on behalf of a customer, including subprocessors, security incidents, and data deletion.",
    filename: "DPA.md",
  },
  {
    name: "Partnership Agreement",
    description: "A standard agreement for business partnerships defining each party's obligations, including a trademark license for co-marketing, payment, confidentiality, and dispute escalation.",
    filename: "Partnership-Agreement.md",
  },
  {
    name: "Software License Agreement",
    description: "A standard agreement for licensing on-premises or self-hosted software, covering access rights, restrictions, payment, updates, open source obligations, and confidentiality.",
    filename: "Software-License-Agreement.md",
  },
  {
    name: "Pilot Agreement",
    description: "A short-term trial agreement allowing a prospective customer to evaluate a product before committing to a full commercial agreement. Supports paid or free pilots.",
    filename: "Pilot-Agreement.md",
  },
  {
    name: "Business Associate Agreement",
    description: "A HIPAA-compliant agreement governing the use and disclosure of protected health information (PHI) by a service provider acting as a business associate.",
    filename: "BAA.md",
  },
  {
    name: "AI Addendum",
    description: "An addendum to an existing commercial agreement governing the use of AI and machine learning features, addressing model training permissions, input/output ownership, and disclaimers.",
    filename: "AI-Addendum.md",
  },
];

export function getSlug(filename: string): string {
  return filename.replace(".md", "");
}

export function findBySlug(slug: string): CatalogEntry | undefined {
  return catalog.find((doc) => getSlug(doc.filename) === slug);
}
