import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent webpack from trying to bundle native Node modules used server-side
  serverExternalPackages: ["puppeteer", "puppeteer-core"],

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Puppeteer and docx are server-only — exclude from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        child_process: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
