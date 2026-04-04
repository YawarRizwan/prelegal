"use client";

import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

export default function ClerkClientProvider({ children }: { children: React.ReactNode }) {
  return <ClerkProvider publishableKey={PUBLISHABLE_KEY}>{children}</ClerkProvider>;
}
