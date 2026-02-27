import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';

/**
 * Global Prisma Client singleton to prevent multiple instances in development
 * due to hot reloading.
 *
 * In production (Vercel), uses Turso (libSQL) via TURSO_DATABASE_URL.
 * In local development, falls back to better-sqlite3 using DATABASE_URL from .env.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    // Production: use Turso (libSQL) — works on Vercel serverless
    // PrismaLibSql accepts a Config object (url + authToken) directly
    const adapter = new PrismaLibSql({
      url: tursoUrl,
      authToken: tursoToken,
    });
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }

  // Local development: use better-sqlite3
  const dbUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
