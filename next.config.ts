import type { NextConfig } from "next";

const codespacesPreviewHost =
  process.env.CODESPACE_NAME && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN
    ? `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
    : undefined;

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: codespacesPreviewHost ? [codespacesPreviewHost] : [],
  experimental: {
    serverActions: {
      allowedOrigins: codespacesPreviewHost
        ? [codespacesPreviewHost, ...(process.env.NODE_ENV === "development" ? ["localhost:3000"] : [])]
        : [],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
