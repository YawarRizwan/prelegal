"use client";

import { SignUp } from "@clerk/clerk-react";

export default function SignUpPage() {
  return (
    <div
      className="flex items-center justify-center"
      style={{ minHeight: "100vh", background: "#f9fafb" }}
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-2">
          <span style={{ color: "#ecad0a", fontWeight: 700, fontSize: 24, letterSpacing: "-0.5px" }}>
            Pre
          </span>
          <span style={{ color: "#032147", fontWeight: 700, fontSize: 24, letterSpacing: "-0.5px" }}>
            legal
          </span>
        </div>
        <SignUp routing="hash" />
      </div>
    </div>
  );
}
