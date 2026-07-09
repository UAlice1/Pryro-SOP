import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent Turbopack/webpack from trying to bundle native Node modules used server-side
  serverExternalPackages: ["puppeteer", "puppeteer-core"],

  // Silence Turbopack warning — serverExternalPackages above already handles
  // the server-only exclusions that the old webpack fallback block was doing.
  turbopack: {},
};

export default nextConfig;
