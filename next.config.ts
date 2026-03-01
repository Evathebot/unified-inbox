import type { NextConfig } from "next";
import { execSync } from "child_process";
import { readFileSync } from "fs";
import { join } from "path";

// Auto-detect version from package.json + git short hash
function getBuildVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(join(__dirname, "package.json"), "utf-8"));
    const base = pkg.version || "1.0.0";
    try {
      const hash = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
      return `v${base}-${hash}`;
    } catch {
      return `v${base}`;
    }
  } catch {
    return "v1.0.0";
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client', 'better-sqlite3', '@libsql/client'],
  images: {
    remotePatterns: [
      { hostname: 'i.pravatar.cc' },
      { hostname: 'matrix.beeper.com' },
      { hostname: 'secure.gravatar.com' },
    ],
  },
  env: {
    // Injected at build time — auto-updates with every new deploy/commit
    NEXT_PUBLIC_APP_VERSION: getBuildVersion(),
  },
};

export default nextConfig;
