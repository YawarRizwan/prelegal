export type DocumentFields = Record<string, string | null>;

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export function mergeFields(current: DocumentFields, patch: DocumentFields): DocumentFields {
  const updates = Object.fromEntries(
    Object.entries(patch).filter(([, v]) => v !== null && v !== undefined)
  );
  return { ...current, ...updates };
}
