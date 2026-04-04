import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  devIndicators: false,
  transpilePackages: ["@clerk/clerk-react"],
};

export default nextConfig;
