import type { Metadata } from "next";
import ClerkClientProvider from "./components/ClerkClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prelegal – Legal Document Drafting",
  description: "Draft legal agreements with AI assistance",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkClientProvider>
      <html lang="en">
        <body className="bg-gray-50 text-gray-900">{children}</body>
      </html>
    </ClerkClientProvider>
  );
}
