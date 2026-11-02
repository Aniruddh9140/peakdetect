import type { NextConfig } from "next";

// GitHub Pages serves static files only, usually from /<repo-name>.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
};

export default nextConfig;
