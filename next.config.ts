import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from bundling native Node modules used server-side
  serverExternalPackages: [
    "puppeteer",
    "puppeteer-core",
    "@sparticuz/chromium-min",
    "@prisma/client",
    "@prisma/adapter-neon",
    "@neondatabase/serverless",
    "bcryptjs",
    "pg",
  ],
};

export default nextConfig;
