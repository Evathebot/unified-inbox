/**
 * Seed Users Script — Create accounts for Alex and Nick
 *
 * Usage: npx tsx scripts/seed-users.ts
 *
 * Each user gets their own account + workspace. They'll use the /login page
 * to authenticate, then connect their own Beeper from Settings.
 *
 * Passwords are printed to stdout after seeding so you can share them securely.
 * Re-running is safe — existing records are updated via upsert.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { randomBytes, scryptSync } from 'crypto';

const adapter = new PrismaBetterSqlite3({ url: 'file:./prisma/dev.db' });
const prisma = new PrismaClient({ adapter } as any);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function generatePassword(): string {
  // 12-char alphanumeric
  return randomBytes(9).toString('base64url').slice(0, 12);
}

interface UserSeed {
  email: string;
  name: string;
  workspaceName: string;
  password?: string; // pass to reset to a known password; omit to auto-generate
}

const USERS: UserSeed[] = [
  {
    email: 'alex@darkhorseconsultancy.ca',
    name: 'Alex Butterfield',
    workspaceName: 'Alex — Dark Horse',
  },
  {
    email: 'nick@darkhorseconsultancy.ca',
    name: 'Nicolas Soucy',
    workspaceName: 'Nick — Dark Horse',
  },
];

async function main() {
  console.log('🌱  Seeding users...\n');

  const results: Array<{ name: string; email: string; password: string; workspaceId: string }> = [];

  for (const seed of USERS) {
    const password = seed.password ?? generatePassword();
    const passwordHash = hashPassword(password);

    // Upsert user (update hash so re-running resets passwords)
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      create: {
        email: seed.email,
        name: seed.name,
        passwordHash,
      },
      update: {
        name: seed.name,
        passwordHash,
      },
    });

    // Upsert workspace
    const workspace = await (prisma.workspace as any).upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: seed.workspaceName,
        settings: JSON.stringify({
          aiAutoDraft: true,
          priorityThreshold: 60,
          notifications: true,
        }),
      },
      update: { name: seed.workspaceName },
    });

    results.push({ name: user.name, email: user.email, password, workspaceId: workspace.id });
    console.log(`✅  ${user.name} (${user.email})  →  workspace ${workspace.id}`);
  }

  console.log('\n🔑  Credentials (save these securely — passwords won\'t be stored in plaintext):\n');
  console.log('  Name               Email                              Password       Workspace ID');
  console.log('  ' + '─'.repeat(90));
  for (const r of results) {
    const namePad = r.name.padEnd(18);
    const emailPad = r.email.padEnd(34);
    const pwPad = r.password.padEnd(14);
    console.log(`  ${namePad} ${emailPad} ${pwPad} ${r.workspaceId}`);
  }

  console.log('\n✔   Done. Users can log in at /login and connect Beeper from Settings.');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
