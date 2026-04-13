import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@boundaryline/shared", "@boundaryline/db"],
  experimental: {
    typedRoutes: true,
  },
};

export default config;
