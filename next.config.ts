import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { agentUpgrade: 'security' },
  typedRoutes: true,
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  images: {
    domains: [],
  },
  async headers() {
    return [
      {
        source: "/images/:path*",
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      },
    ];
  },
};

export default nextConfig;
