/**
 * clear-seed.ts
 *
 * Deletes all seeded/placeholder data from Turso (or local SQLite) while
 * preserving User, Workspace, and Session records.
 *
 * Run once after first deployment to wipe the dummy data:
 *   TURSO_DATABASE_URL="..." TURSO_AUTH_TOKEN="..." npx tsx prisma/clear-seed.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import * as dotenv from 'dotenv';

// Load .env so we can run this locally too
dotenv.config();

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

const adapter = tursoUrl
  ? new PrismaLibSql({ url: tursoUrl, authToken: tursoToken })
  : new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./prisma/dev.db' });

const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🧹 Clearing seed/placeholder data from DB...');
  console.log('   (User, Workspace, and Session records will be preserved)\n');

  // Delete in dependency order (children before parents)
  const aiMeta = await prisma.aIMetadata.deleteMany();
  console.log(`  ✅ Deleted ${aiMeta.count} AIMetadata rows`);

  const attachments = await prisma.attachment.deleteMany();
  console.log(`  ✅ Deleted ${attachments.count} Attachment rows`);

  const messages = await prisma.message.deleteMany();
  console.log(`  ✅ Deleted ${messages.count} Message rows`);

  const calEvents = await prisma.calendarEvent.deleteMany();
  console.log(`  ✅ Deleted ${calEvents.count} CalendarEvent rows`);

  const participants = await prisma.conversationParticipant.deleteMany();
  console.log(`  ✅ Deleted ${participants.count} ConversationParticipant rows`);

  const convos = await prisma.conversation.deleteMany();
  console.log(`  ✅ Deleted ${convos.count} Conversation rows`);

  const identities = await prisma.contactIdentity.deleteMany();
  console.log(`  ✅ Deleted ${identities.count} ContactIdentity rows`);

  const contacts = await prisma.contact.deleteMany();
  console.log(`  ✅ Deleted ${contacts.count} Contact rows`);

  const connections = await prisma.connection.deleteMany();
  console.log(`  ✅ Deleted ${connections.count} Connection rows`);

  const syncStates = await prisma.syncState.deleteMany();
  console.log(`  ✅ Deleted ${syncStates.count} SyncState rows`);

  console.log('\n✅ Done! DB is now clean.');
  console.log('   Users, Workspaces, and Sessions are untouched.');
  console.log('   You can now sync Beeper to populate with real data.\n');
}

main()
  .catch((e) => {
    console.error('❌ clear-seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
