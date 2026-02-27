import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  serverExternalPackages: ['@prisma/client', 'better-sqlite3'],
  images: {
    remotePatterns: [
      { hostname: 'i.pravatar.cc' },
    ],
  },
};

export default nextConfig;
