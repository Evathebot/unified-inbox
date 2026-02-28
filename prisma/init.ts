/**
 * Production DB initializer — runs during Vercel build (after prisma db push).
 *
 * Unlike seed.ts, this script NEVER deletes existing data.
 * It only creates the essential user + workspace records if they don't exist yet.
 * Safe to run on every deployment.
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const adapter = tursoUrl
  ? new PrismaLibSql({ url: tursoUrl, authToken: tursoToken })
  : new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./prisma/dev.db' });

const prisma = new PrismaClient({ adapter } as any);

const DEFAULT_PASSWORD = 'DarkHorse2026!';

const USERS = [
  { email: 'alex@darkhorseads.com', name: 'Alex', workspaceName: "Alex's Workspace" },
  { email: 'nick@darkhorseads.com', name: 'Nick', workspaceName: "Nick's Workspace" },
];

async function main() {
  console.log('🔧 Running DB init (upsert-only, no deletions)...');

  for (const u of USERS) {
    // Create user if not exists
    let user = await prisma.user.findUnique({ where: { email: u.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          passwordHash: await hashPassword(DEFAULT_PASSWORD),
        },
      });
      console.log(`  ✅ Created user: ${u.email}`);
    } else {
      console.log(`  ⏭️  User already exists: ${u.email}`);
    }

    // Create workspace if not exists
    const existing = await prisma.workspace.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.workspace.create({
        data: {
          userId: user.id,
          name: u.workspaceName,
          settings: JSON.stringify({
            autoDraft: true,
            priorityScore: 60,
            notifications: true,
            theme: 'light',
          }),
        },
      });
      console.log(`  ✅ Created workspace: ${u.workspaceName}`);
    } else {
      console.log(`  ⏭️  Workspace already exists: ${u.workspaceName}`);
    }
  }

  console.log('✅ DB init complete');
}

main()
  .catch((e) => {
    console.error('❌ DB init failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
