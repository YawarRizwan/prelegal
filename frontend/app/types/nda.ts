export interface NdaFields {
  party1_company: string | null;
  party1_name: string | null;
  party1_title: string | null;
  party1_address: string | null;
  party2_company: string | null;
  party2_name: string | null;
  party2_title: string | null;
  party2_address: string | null;
  purpose: string | null;
  effective_date: string | null;
  mnda_term_type: "years" | "terminated" | null;
  mnda_term_years: number | null;
  confidentiality_term_type: "years" | "perpetuity" | null;
  confidentiality_term_years: number | null;
  governing_law: string | null;
  jurisdiction: string | null;
  modifications: string | null;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export const emptyFields: NdaFields = {
  party1_company: null,
  party1_name: null,
  party1_title: null,
  party1_address: null,
  party2_company: null,
  party2_name: null,
  party2_title: null,
  party2_address: null,
  purpose: null,
  effective_date: null,
  mnda_term_type: null,
  mnda_term_years: null,
  confidentiality_term_type: null,
  confidentiality_term_years: null,
  governing_law: null,
  jurisdiction: null,
  modifications: null,
};

export function mergeFields(current: NdaFields, patch: NdaFields): NdaFields {
  const updates = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== null && v !== undefined)
  );
  return { ...current, ...updates } as NdaFields;
}
