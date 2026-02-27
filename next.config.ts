import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'better-sqlite3', '@libsql/client'],
  images: {
    remotePatterns: [
      { hostname: 'i.pravatar.cc' },
      { hostname: 'matrix.beeper.com' },
      { hostname: 'secure.gravatar.com' },
    ],
  },
};

export default nextConfig;
