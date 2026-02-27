import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data in dependency order
  await prisma.aIMetadata.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.conversationParticipant.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contactIdentity.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.syncState.deleteMany();
  await prisma.connection.deleteMany();
  await prisma.session.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  console.log('👤 Creating user and workspace...');

  // Create the default user
  const user = await prisma.user.create({
    data: {
      email: 'alex@example.com',
      name: 'Alex',
      passwordHash: await hashPassword('password123'),
    },
  });

  // Create their workspace
  const workspace = await prisma.workspace.create({
    data: {
      userId: user.id,
      name: 'My Workspace',
      settings: JSON.stringify({
        autoDraft: true,
        priorityScore: 60,
        notifications: true,
        theme: 'light',
      }),
    },
  });

  console.log(`✅ Created user (${user.email}) and workspace`);
  console.log('📧 Creating contacts...');

  // Create contacts (using correct schema fields: name, company, role, location, bio, etc.)
  const contacts = await Promise.all([
    // High-priority business contacts
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Sarah Chen',
        displayName: 'Sarah Chen',
        avatar: 'https://i.pravatar.cc/150?img=1',
        company: 'Design Studio Inc.',
        role: 'Lead Designer',
        location: 'Toronto',
        bio: 'Sarah Chen is the Lead Designer at Design Studio Inc. in Toronto. She specializes in brand identity and UI/UX design with over 8 years of experience.',
        relationshipScore: 85,
        lastContactDate: new Date('2026-02-20'),
        notes: 'Lead designer for the rebrand project. Very detail-oriented.',
        personalityProfile: JSON.stringify({
          communicationStyle: 'Visual and detail-oriented. Shares mood boards and references.',
          decisionMaking: 'Collaborative, seeks consensus before finalizing.',
          preferredLanguage: 'English',
          interests: ['UI Design', 'Typography', 'Brand Strategy'],
          bestTimeToReach: 'Weekday mornings 9-11 AM EST',
        }),
        metadata: JSON.stringify({ slackId: 'U01ABC123' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Marc Tremblay',
        displayName: 'Marc Tremblay',
        avatar: 'https://i.pravatar.cc/150?img=2',
        company: 'Rénovation Pro',
        role: 'General Contractor',
        location: 'Montreal',
        bio: 'Marc Tremblay runs Rénovation Pro in Montreal, specializing in commercial and office renovations. Primarily French-speaking.',
        relationshipScore: 75,
        lastContactDate: new Date('2026-02-19'),
        notes: 'Contractor for office renovation. Speaks French primarily.',
        metadata: JSON.stringify({ whatsappId: '+15145550202' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'James Wilson',
        displayName: 'James Wilson',
        avatar: 'https://i.pravatar.cc/150?img=3',
        company: 'Tech Ventures',
        role: 'Managing Partner',
        location: 'Toronto',
        bio: 'James Wilson is Managing Partner at Tech Ventures, a Toronto-based VC firm. He is an active advisor and investor, known for quick responses and strategic thinking.',
        relationshipScore: 90,
        lastContactDate: new Date('2026-02-21'),
        notes: 'Investor and advisor. Very responsive, high priority.',
        metadata: JSON.stringify({ telegramId: '@jameswilson' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Amélie Dubois',
        displayName: 'Amélie Dubois',
        avatar: 'https://i.pravatar.cc/150?img=4',
        company: 'Marketing Plus',
        role: 'Marketing Director',
        location: 'Montreal',
        bio: 'Amélie Dubois is Marketing Director at Marketing Plus in Montreal. Bilingual in French and English, she is leading the Q1 campaign launch.',
        relationshipScore: 70,
        lastContactDate: new Date('2026-02-18'),
        notes: 'Marketing consultant. Bilingual, prefers French.',
        metadata: JSON.stringify({ slackId: 'U02DEF456', email: 'amelie@marketingplus.ca' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'David Park',
        displayName: 'David Park',
        avatar: 'https://i.pravatar.cc/150?img=5',
        company: 'DevTeam Solutions',
        role: 'Lead Developer',
        location: 'Vancouver',
        bio: 'David Park is Lead Developer at DevTeam Solutions in Vancouver. He specializes in full-stack development and API integrations.',
        relationshipScore: 65,
        lastContactDate: new Date('2026-02-17'),
        notes: 'Lead developer on the platform project.',
        metadata: JSON.stringify({ slackId: 'U03GHI789', email: 'david@devteam.io' }),
      },
    }),
    // Medium-priority contacts
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Lisa Anderson',
        displayName: 'Lisa Anderson',
        avatar: 'https://i.pravatar.cc/150?img=6',
        role: 'Freelance Copywriter',
        location: 'Toronto',
        bio: 'Lisa Anderson is a freelance copywriter based in Toronto, specializing in tech and SaaS content.',
        relationshipScore: 55,
        lastContactDate: new Date('2026-02-15'),
        notes: 'Freelance copywriter.',
        metadata: JSON.stringify({ email: 'lisa@freelance.com' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Robert Gagnon',
        displayName: 'Robert Gagnon',
        avatar: 'https://i.pravatar.cc/150?img=7',
        company: 'Comptabilité R.G.',
        role: 'Accountant',
        location: 'Montreal',
        bio: 'Robert Gagnon manages your business accounting at Comptabilité R.G. in Montreal. French-speaking.',
        relationshipScore: 60,
        lastContactDate: new Date('2026-02-10'),
        notes: 'Accountant. French-speaking.',
        metadata: JSON.stringify({ email: 'robert@comptabilite.qc.ca' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Emily Thompson',
        displayName: 'Emily Thompson',
        avatar: 'https://i.pravatar.cc/150?img=8',
        company: 'Startup Accelerator',
        role: 'Program Director',
        location: 'Toronto',
        bio: 'Emily Thompson is Program Director at Startup Accelerator in Toronto. She connects founders with mentors and investors.',
        relationshipScore: 50,
        lastContactDate: new Date('2026-02-05'),
        metadata: JSON.stringify({ whatsappId: '+16475550707', email: 'emily@startupaccelerator.com' }),
      },
    }),
    // Lower-priority contacts
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Michael Brown',
        role: 'Account Manager',
        location: 'Toronto',
        relationshipScore: 40,
        lastContactDate: new Date('2026-01-28'),
        notes: 'Office supplies vendor.',
        metadata: JSON.stringify({ email: 'michael@supplies.com' }),
      },
    }),
    prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: 'Sophie Martin',
        role: 'Event Coordinator',
        location: 'Toronto',
        relationshipScore: 35,
        lastContactDate: new Date('2026-01-20'),
        metadata: JSON.stringify({ email: 'sophie@events.ca', phone: '+1-416-555-0808' }),
      },
    }),
  ]);

  // Add contact identities for platform linking
  await Promise.all([
    // Sarah Chen — Slack
    prisma.contactIdentity.create({
      data: {
        contactId: contacts[0].id,
        platform: 'slack',
        platformUserId: 'U01ABC123',
        displayName: 'Sarah Chen',
        networkContext: JSON.stringify({ workspace: 'DarkHorse Inc.' }),
      },
    }),
    // Marc Tremblay — WhatsApp
    prisma.contactIdentity.create({
      data: {
        contactId: contacts[1].id,
        platform: 'whatsapp',
        platformUserId: '+15145550202',
        displayName: 'Marc Tremblay',
        phone: '+15145550202',
      },
    }),
    // James Wilson — Telegram
    prisma.contactIdentity.create({
      data: {
        contactId: contacts[2].id,
        platform: 'telegram',
        platformUserId: '@jameswilson',
        displayName: 'James Wilson',
        username: 'jameswilson',
      },
    }),
    // Amélie Dubois — Gmail + Slack
    prisma.contactIdentity.create({
      data: {
        contactId: contacts[3].id,
        platform: 'gmail',
        platformUserId: 'amelie@marketingplus.ca',
        displayName: 'Amélie Dubois',
        email: 'amelie@marketingplus.ca',
      },
    }),
    // David Park — Slack
    prisma.contactIdentity.create({
      data: {
        contactId: contacts[4].id,
        platform: 'slack',
        platformUserId: 'U03GHI789',
        displayName: 'David Park',
        networkContext: JSON.stringify({ workspace: 'DarkHorse Inc.' }),
      },
    }),
    // Robert Gagnon — Gmail
    prisma.contactIdentity.create({
      data: {
        contactId: contacts[6].id,
        platform: 'gmail',
        platformUserId: 'robert@comptabilite.qc.ca',
        displayName: 'Robert Gagnon',
        email: 'robert@comptabilite.qc.ca',
      },
    }),
  ]);

  console.log(`✅ Created ${contacts.length} contacts with identities`);
  console.log('💬 Creating conversations...');

  // Create conversations (correct schema fields: workspaceId, channel, type, title, contactId, lastMessageAt, unreadCount, priority)
  const conversations = await Promise.all([
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Website Redesign Project',
        channel: 'slack',
        type: 'single',
        contactId: contacts[0].id, // Sarah Chen
        lastMessageAt: new Date('2026-02-20T14:30:00'),
        unreadCount: 2,
        priority: 85,
        channelContext: JSON.stringify({ workspace: 'DarkHorse Inc.', channelName: '#design' }),
      },
    }),
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Office Renovation Updates',
        channel: 'whatsapp',
        type: 'single',
        contactId: contacts[1].id, // Marc Tremblay
        lastMessageAt: new Date('2026-02-19T16:45:00'),
        unreadCount: 2,
        priority: 75,
      },
    }),
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Investment Discussion',
        channel: 'telegram',
        type: 'single',
        contactId: contacts[2].id, // James Wilson
        lastMessageAt: new Date('2026-02-21T10:15:00'),
        unreadCount: 2,
        priority: 90,
      },
    }),
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Q1 Marketing Campaign',
        channel: 'gmail',
        type: 'single',
        contactId: contacts[3].id, // Amélie Dubois
        lastMessageAt: new Date('2026-02-18T11:20:00'),
        unreadCount: 1,
        priority: 70,
      },
    }),
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Platform Development',
        channel: 'slack',
        type: 'single',
        contactId: contacts[4].id, // David Park
        lastMessageAt: new Date('2026-02-17T09:00:00'),
        unreadCount: 0,
        priority: 65,
        channelContext: JSON.stringify({ workspace: 'DarkHorse Inc.', channelName: '#engineering' }),
      },
    }),
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Accounting & Invoices',
        channel: 'gmail',
        type: 'single',
        contactId: contacts[6].id, // Robert Gagnon
        lastMessageAt: new Date('2026-02-26T09:00:00'),
        unreadCount: 1,
        priority: 60,
      },
    }),
    prisma.conversation.create({
      data: {
        workspaceId: workspace.id,
        title: 'Website Copy',
        channel: 'gmail',
        type: 'single',
        contactId: contacts[5].id, // Lisa Anderson
        lastMessageAt: new Date('2026-02-24T10:00:00'),
        unreadCount: 0,
        priority: 50,
      },
    }),
  ]);

  console.log(`✅ Created ${conversations.length} conversations`);
  console.log('📨 Creating messages...');

  const now = new Date();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Create messages using correct schema fields:
  // workspaceId, conversationId, channel, senderName, senderContactId, body, subject, timestamp, read, priority, aiDraft, metadata
  const messages = await Promise.all([
    // Gmail — Amélie Dubois (urgent campaign)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[3].id,
        externalId: 'gmail-001',
        channel: 'gmail',
        senderName: 'Amélie Dubois',
        senderContactId: contacts[3].id,
        subject: 'Urgent: Campaign Launch Deadline Approaching',
        body: 'Hi Alex,\n\nJust wanted to remind you that the Q1 campaign launch is scheduled for next Monday. We need your final approval on the creative assets by Friday.\n\nCould we schedule a quick call tomorrow to review?\n\nBest,\nAmélie',
        timestamp: hoursAgo(2),
        read: false,
        priority: 85,
      },
    }),
    // Gmail — Robert Gagnon (invoice)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[5].id,
        externalId: 'gmail-002',
        channel: 'gmail',
        senderName: 'Robert Gagnon',
        senderContactId: contacts[6].id,
        subject: 'Facture - Février 2026',
        body: 'Bonjour Alex,\n\nVeuillez trouver ci-joint la facture pour les services comptables de février.\n\nMerci de procéder au paiement dans les 15 jours.\n\nCordialement,\nRobert Gagnon',
        timestamp: daysAgo(1),
        read: false,
        priority: 70,
      },
    }),
    // Gmail — Lisa Anderson (website copy)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[6].id,
        externalId: 'gmail-003',
        channel: 'gmail',
        senderName: 'Lisa Anderson',
        senderContactId: contacts[5].id,
        subject: 'Website Copy - First Draft',
        body: 'Hey Alex,\n\nI\'ve finished the first draft of the homepage copy. Let me know what you think!\n\nI tried to capture that conversational yet professional tone we discussed.\n\nLisa',
        timestamp: daysAgo(3),
        read: true,
        priority: 50,
      },
    }),
    // Gmail — notification (low priority)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[3].id,
        externalId: 'gmail-004',
        channel: 'gmail',
        senderName: 'LinkedIn Notifications',
        subject: 'You have 5 new connection requests',
        body: 'People are trying to connect with you on LinkedIn...',
        timestamp: hoursAgo(12),
        read: true,
        priority: 20,
      },
    }),
    // WhatsApp — Marc Tremblay (renovation)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[1].id,
        externalId: 'whatsapp-001',
        channel: 'whatsapp',
        senderName: 'Marc Tremblay',
        senderContactId: contacts[1].id,
        body: 'Salut Alex! Les travaux avancent bien. Par contre, on a un petit problème avec la plomberie. Ça va coûter 500$ de plus. Tu es OK?',
        timestamp: hoursAgo(5),
        read: false,
        priority: 75,
        metadata: JSON.stringify({ isDM: true }),
      },
    }),
    // WhatsApp — Marc Tremblay (payment)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[1].id,
        externalId: 'whatsapp-002',
        channel: 'whatsapp',
        senderName: 'Marc Tremblay',
        senderContactId: contacts[1].id,
        body: 'Aussi, je vais avoir besoin du paiement pour cette semaine avant vendredi. Merci!',
        timestamp: hoursAgo(4),
        read: false,
        priority: 80,
        metadata: JSON.stringify({ isDM: true }),
      },
    }),
    // Telegram — James Wilson (investment)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[2].id,
        externalId: 'telegram-001',
        channel: 'telegram',
        senderName: 'James Wilson',
        senderContactId: contacts[2].id,
        body: 'Alex, fantastic progress on the platform! The demo yesterday was impressive. I\'d like to discuss increasing our investment. Can we talk this week?',
        timestamp: hoursAgo(1),
        read: false,
        priority: 95,
        metadata: JSON.stringify({ isDM: true }),
      },
    }),
    // Telegram — James Wilson (introduction)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[2].id,
        externalId: 'telegram-002',
        channel: 'telegram',
        senderName: 'James Wilson',
        senderContactId: contacts[2].id,
        body: 'Also wanted to introduce you to someone from our portfolio. I think there could be great synergy.',
        timestamp: hoursAgo(1),
        read: false,
        priority: 85,
        metadata: JSON.stringify({ isDM: true }),
      },
    }),
    // Slack — Sarah Chen (mockups)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[0].id,
        externalId: 'slack-001',
        channel: 'slack',
        senderName: 'Sarah Chen',
        senderContactId: contacts[0].id,
        body: 'Hey Alex! Just uploaded the latest mockups to Figma. The new color palette looks amazing. Need your feedback before I proceed with the rest of the pages.',
        timestamp: hoursAgo(3),
        read: false,
        priority: 75,
        metadata: JSON.stringify({ workspace: 'DarkHorse Inc.', channelName: '#design', isDM: false }),
      },
    }),
    // Slack — Sarah Chen (font question)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[0].id,
        externalId: 'slack-002',
        channel: 'slack',
        senderName: 'Sarah Chen',
        senderContactId: contacts[0].id,
        body: 'BTW, do you prefer the serif or sans-serif font for headings? I\'m leaning towards serif but want to make sure we\'re aligned.',
        timestamp: hoursAgo(3),
        read: false,
        priority: 60,
        metadata: JSON.stringify({ workspace: 'DarkHorse Inc.', channelName: '#design', isDM: false }),
      },
    }),
    // Slack — David Park (API question)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[4].id,
        externalId: 'slack-003',
        channel: 'slack',
        senderName: 'David Park',
        senderContactId: contacts[4].id,
        body: 'Morning! Quick question about the API integration. Do we need OAuth or is API key auth sufficient for the MVP?',
        timestamp: hoursAgo(6),
        read: true,
        priority: 65,
        metadata: JSON.stringify({ workspace: 'DarkHorse Inc.', channelName: '#engineering', isDM: false }),
        aiDraft: 'Hey David! For the MVP, API key authentication should be sufficient. We can implement OAuth in phase 2 once we have more users.\n\nLet me know if you need any clarification!\n\nBest,\nAlex',
      },
    }),
    // Slack — David Park (resolved)
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[4].id,
        externalId: 'slack-004',
        channel: 'slack',
        senderName: 'David Park',
        senderContactId: contacts[4].id,
        body: 'Perfect, that makes sense. Will go with API keys then. Should have the first version ready for testing by EOD.',
        timestamp: hoursAgo(5),
        read: true,
        priority: 55,
        metadata: JSON.stringify({ workspace: 'DarkHorse Inc.', channelName: '#engineering', isDM: false }),
      },
    }),
    // Gmail — Amélie follow-up
    prisma.message.create({
      data: {
        workspaceId: workspace.id,
        conversationId: conversations[3].id,
        externalId: 'gmail-006',
        channel: 'gmail',
        senderName: 'Amélie Dubois',
        senderContactId: contacts[3].id,
        subject: 'Re: Campaign Launch Deadline',
        body: 'Je suis disponible demain à 14h pour un appel. Ça te convient?\n\nAmélie',
        timestamp: daysAgo(2),
        read: true,
        priority: 70,
      },
    }),
  ]);

  console.log(`✅ Created ${messages.length} messages`);
  console.log('🤖 Creating AI metadata...');

  // AI metadata for key messages
  await Promise.all([
    prisma.aIMetadata.create({
      data: {
        messageId: messages[0].id,
        priorityScore: 85,
        priorityReason: 'Contains keyword: "urgent"; Contains keyword: "deadline"; Known contact (Amélie Dubois); gmail channel (+5); Received today',
        draftReply: 'Hi Amélie,\n\nThanks for the reminder. I\'d be happy to schedule a call tomorrow. Does 2 PM work for you?\n\nI\'ll review the assets tonight and come prepared with feedback.\n\nBest,\nAlex',
        sentiment: 'neutral',
        topics: JSON.stringify(['meeting', 'project', 'marketing']),
        actionItems: JSON.stringify([
          'Review creative assets',
          'Schedule call for tomorrow',
          'Provide final approval by Friday',
        ]),
      },
    }),
    prisma.aIMetadata.create({
      data: {
        messageId: messages[1].id,
        priorityScore: 70,
        priorityReason: 'Contains keyword: "payment"; Contains keyword: "invoice"; Known contact (Robert Gagnon)',
        sentiment: 'neutral',
        topics: JSON.stringify(['payment', 'invoice']),
        actionItems: JSON.stringify(['Process payment within 15 days']),
      },
    }),
    prisma.aIMetadata.create({
      data: {
        messageId: messages[4].id,
        priorityScore: 75,
        priorityReason: 'High-priority contact (Marc Tremblay); WhatsApp channel (+10); Direct message',
        sentiment: 'neutral',
        topics: JSON.stringify(['payment', 'project']),
        actionItems: JSON.stringify([
          'Approve additional $500 expense',
          'Confirm payment by Friday',
        ]),
      },
    }),
    prisma.aIMetadata.create({
      data: {
        messageId: messages[6].id,
        priorityScore: 95,
        priorityReason: 'Very close contact (James Wilson); Contains keyword: "investment"; Direct message; Received within last hour',
        sentiment: 'positive',
        topics: JSON.stringify(['meeting', 'business']),
        actionItems: JSON.stringify(['Schedule investment discussion this week']),
      },
    }),
  ]);

  console.log('✅ Created AI metadata');
  console.log('📅 Creating calendar events...');

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  await Promise.all([
    prisma.calendarEvent.create({
      data: {
        workspaceId: workspace.id,
        title: 'Campaign Review Call with Amélie',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000),
        attendees: JSON.stringify(['amelie@marketingplus.ca']),
        contactId: contacts[3].id,
        location: 'Zoom',
        briefing: 'Review Q1 campaign creative assets and finalize launch timeline.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        workspaceId: workspace.id,
        title: 'Investment Discussion — James Wilson',
        startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000),
        attendees: JSON.stringify(['james@techventures.com', 'partner@techventures.com']),
        contactId: contacts[2].id,
        location: 'Coffee Lab, Downtown',
        briefing: 'Discuss increased investment and potential introduction to portfolio company.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        workspaceId: workspace.id,
        title: 'Site Visit — Office Renovation',
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
        attendees: JSON.stringify(['marc@renovationpro.qc.ca']),
        contactId: contacts[1].id,
        location: 'Office — 123 Main St',
        briefing: 'Walk-through of renovation progress. Discuss plumbing issue and payment.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        workspaceId: workspace.id,
        title: 'Design Review — Sarah Chen',
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 90 * 60 * 1000),
        attendees: JSON.stringify(['sarah@designstudio.ca']),
        contactId: contacts[0].id,
        location: 'Design Studio Office',
        briefing: 'Review final website mockups and approve design direction.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        workspaceId: workspace.id,
        title: 'Platform Demo — Development Team',
        startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        attendees: JSON.stringify(['david@devteam.io', 'team@devteam.io']),
        contactId: contacts[4].id,
        location: 'Virtual — Google Meet',
        briefing: 'Demo of MVP features and API integration.',
      },
    }),
  ]);

  console.log('✅ Created calendar events');
  console.log(`\n🎉 Seed completed successfully!`);
  console.log(`\n📋 Login credentials:`);
  console.log(`   Email:    ${user.email}`);
  console.log(`   Password: password123`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
