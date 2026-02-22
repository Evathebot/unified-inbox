/**
 * Setup Script — Create a workspace and Beeper connection
 * 
 * Usage: npx tsx scripts/setup-workspace.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🏗️  Setting up multi-tenant workspace...\n');

  // Create user
  const user = await prisma.user.upsert({
    where: { email: 'nick@darkhorseads.com' },
    create: {
      email: 'nick@darkhorseads.com',
      name: 'Nicolas Soucy',
    },
    update: {},
  });
  console.log(`✅ User: ${user.name} (${user.email})`);

  // Create workspace
  const workspace = await prisma.workspace.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      name: 'DarkHorse Marketing',
      settings: JSON.stringify({
        aiAutoDraft: true,
        priorityThreshold: 60,
        notifications: true,
      }),
    },
    update: {},
  });
  console.log(`✅ Workspace: ${workspace.name} (${workspace.id})`);

  // Create Beeper connection
  const beeperToken = process.env.BEEPER_TOKEN || 'dc1505e4-2634-4b93-83da-935208db6d89';
  
  const connection = await prisma.connection.upsert({
    where: {
      workspaceId_platform_accountId: {
        workspaceId: workspace.id,
        platform: 'beeper',
        accountId: 'nick-legault:beeper.com',
      },
    },
    create: {
      workspaceId: workspace.id,
      platform: 'beeper',
      accountId: 'nick-legault:beeper.com',
      network: 'all',
      displayName: 'Beeper (All Networks)',
      accessToken: beeperToken,
      apiUrl: 'http://localhost:23373',
      status: 'active',
    },
    update: {
      accessToken: beeperToken,
      status: 'active',
    },
  });
  console.log(`✅ Beeper connection: ${connection.displayName}`);

  console.log('\n📋 Summary:');
  console.log(`   Workspace ID: ${workspace.id}`);
  console.log(`   Connection ID: ${connection.id}`);
  console.log(`   Beeper API: ${connection.apiUrl}`);
  console.log('\n🚀 Ready to sync! Run:');
  console.log(`   curl -X POST http://localhost:3000/api/sync -H "Content-Type: application/json" -d '{"workspaceId":"${workspace.id}"}'`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
