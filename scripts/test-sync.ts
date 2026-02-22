/**
 * Test sync — directly syncs from Beeper via PowerShell bridge
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { BeeperService } from '../src/lib/services/beeper';
import { SyncEngine } from '../src/lib/services/sync-engine';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Get workspace and connection
  const workspace = await prisma.workspace.findFirst();
  if (!workspace) throw new Error('No workspace found. Run setup-workspace.ts first.');

  const connection = await prisma.connection.findFirst({
    where: { workspaceId: workspace.id, platform: 'beeper' },
  });
  if (!connection) throw new Error('No Beeper connection found.');

  console.log(`\n🔄 Syncing workspace: ${workspace.name}`);
  console.log(`   Beeper API: ${connection.apiUrl}`);
  console.log('');

  // Test Beeper connectivity first
  const beeper = new BeeperService({
    apiUrl: connection.apiUrl!,
    accessToken: connection.accessToken!,
  });

  console.log('📡 Testing Beeper connection...');
  const accounts = await beeper.getAccounts();
  console.log(`✅ Connected! ${accounts.length} accounts found:`);
  for (const acc of accounts) {
    console.log(`   - ${acc.network}: ${acc.user.fullName || acc.user.displayText}`);
  }

  // Run sync
  console.log('\n🔄 Starting full sync...');
  const syncEngine = new SyncEngine(prisma, beeper, workspace.id, connection.id);
  const result = await syncEngine.fullSync({ chatLimit: 20, messagesPerChat: 10 });

  console.log('\n📊 Sync Results:');
  console.log(`   Accounts: ${result.accounts}`);
  console.log(`   Conversations: ${result.conversations}`);
  console.log(`   Messages: ${result.messages}`);
  console.log(`   Contacts: ${result.contacts}`);
  console.log(`   Duration: ${result.duration}ms`);
  
  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errors (${result.errors.length}):`);
    result.errors.forEach(e => console.log(`   - ${e}`));
  }

  // Show contacts with their identities
  const contacts = await prisma.contact.findMany({
    where: { workspaceId: workspace.id },
    include: { identities: true },
    orderBy: { name: 'asc' },
  });

  console.log(`\n👥 Contacts (${contacts.length}):`);
  for (const c of contacts) {
    console.log(`   ${c.name}`);
    for (const id of c.identities) {
      console.log(`     └─ ${id.platform}: ${id.phone || id.email || id.platformUserId}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
