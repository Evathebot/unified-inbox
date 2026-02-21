import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting seed...');

  // Clear existing data
  await prisma.aIMetadata.deleteMany();
  await prisma.message.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.contact.deleteMany();

  console.log('📧 Creating contacts...');

  // Create contacts
  const contacts = await Promise.all([
    // High-priority business contacts
    prisma.contact.create({
      data: {
        name: 'Sarah Chen',
        email: 'sarah@designstudio.ca',
        phone: '+1-416-555-0101',
        slackId: 'U01ABC123',
        avatar: 'https://i.pravatar.cc/150?img=1',
        businessEntity: 'Design Studio Inc.',
        relationshipScore: 85,
        lastContactDate: new Date('2026-02-20'),
        notes: 'Lead designer for the rebrand project. Very detail-oriented.',
        personalityProfile: '💼 **Important contact** - established business relationship\n**Communication:** Prefers email, professional tone',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Marc Tremblay',
        email: 'marc@renovationpro.qc.ca',
        phone: '+1-514-555-0202',
        whatsappId: '+15145550202',
        avatar: 'https://i.pravatar.cc/150?img=2',
        businessEntity: 'Rénovation Pro',
        relationshipScore: 75,
        lastContactDate: new Date('2026-02-19'),
        notes: 'Contractor for office renovation. Speaks French primarily.',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'James Wilson',
        email: 'james@techventures.com',
        phone: '+1-647-555-0303',
        telegramId: '@jameswilson',
        avatar: 'https://i.pravatar.cc/150?img=3',
        businessEntity: 'Tech Ventures',
        relationshipScore: 90,
        lastContactDate: new Date('2026-02-21'),
        notes: 'Investor and advisor. Very responsive, high priority.',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Amélie Dubois',
        email: 'amelie@marketingplus.ca',
        phone: '+1-438-555-0404',
        slackId: 'U02DEF456',
        avatar: 'https://i.pravatar.cc/150?img=4',
        businessEntity: 'Marketing Plus',
        relationshipScore: 70,
        lastContactDate: new Date('2026-02-18'),
        notes: 'Marketing consultant. Bilingual, prefers French.',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'David Park',
        email: 'david@devteam.io',
        slackId: 'U03GHI789',
        avatar: 'https://i.pravatar.cc/150?img=5',
        businessEntity: 'DevTeam Solutions',
        relationshipScore: 65,
        lastContactDate: new Date('2026-02-17'),
        notes: 'Lead developer on the platform project.',
      },
    }),
    // Medium-priority contacts
    prisma.contact.create({
      data: {
        name: 'Lisa Anderson',
        email: 'lisa@freelance.com',
        phone: '+1-416-555-0505',
        avatar: 'https://i.pravatar.cc/150?img=6',
        relationshipScore: 55,
        lastContactDate: new Date('2026-02-15'),
        notes: 'Freelance copywriter.',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Robert Gagnon',
        email: 'robert@comptabilite.qc.ca',
        phone: '+1-514-555-0606',
        avatar: 'https://i.pravatar.cc/150?img=7',
        businessEntity: 'Comptabilité R.G.',
        relationshipScore: 60,
        lastContactDate: new Date('2026-02-10'),
        notes: 'Accountant. French-speaking.',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Emily Thompson',
        email: 'emily@startupaccelerator.com',
        whatsappId: '+16475550707',
        avatar: 'https://i.pravatar.cc/150?img=8',
        businessEntity: 'Startup Accelerator',
        relationshipScore: 50,
        lastContactDate: new Date('2026-02-05'),
      },
    }),
    // Lower-priority contacts
    prisma.contact.create({
      data: {
        name: 'Michael Brown',
        email: 'michael@supplies.com',
        relationshipScore: 40,
        lastContactDate: new Date('2026-01-28'),
        notes: 'Office supplies vendor.',
      },
    }),
    prisma.contact.create({
      data: {
        name: 'Sophie Martin',
        email: 'sophie@events.ca',
        phone: '+1-416-555-0808',
        relationshipScore: 35,
        lastContactDate: new Date('2026-01-20'),
      },
    }),
  ]);

  console.log(`✅ Created ${contacts.length} contacts`);
  console.log('💬 Creating conversations...');

  // Create conversations
  const conversations = await Promise.all([
    prisma.conversation.create({
      data: {
        title: 'Website Redesign Project',
        channel: 'slack',
        contactId: contacts[0].id, // Sarah Chen
        lastMessageAt: new Date('2026-02-20T14:30:00'),
        unreadCount: 2,
        priority: 85,
      },
    }),
    prisma.conversation.create({
      data: {
        title: 'Office Renovation Updates',
        channel: 'whatsapp',
        contactId: contacts[1].id, // Marc Tremblay
        lastMessageAt: new Date('2026-02-19T16:45:00'),
        unreadCount: 1,
        priority: 75,
      },
    }),
    prisma.conversation.create({
      data: {
        title: 'Investment Discussion',
        channel: 'telegram',
        contactId: contacts[2].id, // James Wilson
        lastMessageAt: new Date('2026-02-21T10:15:00'),
        unreadCount: 3,
        priority: 90,
      },
    }),
    prisma.conversation.create({
      data: {
        title: 'Q1 Marketing Campaign',
        channel: 'gmail',
        contactId: contacts[3].id, // Amélie Dubois
        lastMessageAt: new Date('2026-02-18T11:20:00'),
        unreadCount: 0,
        priority: 70,
      },
    }),
    prisma.conversation.create({
      data: {
        title: 'Platform Development',
        channel: 'slack',
        contactId: contacts[4].id, // David Park
        lastMessageAt: new Date('2026-02-17T09:00:00'),
        unreadCount: 0,
        priority: 65,
      },
    }),
  ]);

  console.log(`✅ Created ${conversations.length} conversations`);
  console.log('📨 Creating messages...');

  const now = new Date();
  
  // Helper function to create dates relative to now
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 60 * 60 * 1000);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Create messages - mix across all channels
  const messages = await Promise.all([
    // Gmail messages
    prisma.message.create({
      data: {
        externalId: 'gmail-001',
        channel: 'gmail',
        from: contacts[3].email!,
        to: 'alex@example.com',
        subject: 'Urgent: Campaign Launch Deadline Approaching',
        body: 'Hi Alex,\n\nJust wanted to remind you that the Q1 campaign launch is scheduled for next Monday. We need your final approval on the creative assets by Friday.\n\nCould we schedule a quick call tomorrow to review?\n\nBest,\nAmélie',
        timestamp: hoursAgo(2),
        read: false,
        priority: 85,
        threadId: conversations[3].id,
        contactId: contacts[3].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'gmail-002',
        channel: 'gmail',
        from: contacts[6].email!,
        to: 'alex@example.com',
        subject: 'Facture - Février 2026',
        body: 'Bonjour Alex,\n\nVeuillez trouver ci-joint la facture pour les services comptables de février.\n\nMerci de procéder au paiement dans les 15 jours.\n\nCordialement,\nRobert Gagnon',
        timestamp: daysAgo(1),
        read: false,
        priority: 70,
        contactId: contacts[6].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'gmail-003',
        channel: 'gmail',
        from: contacts[5].email!,
        to: 'alex@example.com',
        subject: 'Website Copy - First Draft',
        body: 'Hey Alex,\n\nI\'ve finished the first draft of the homepage copy. Let me know what you think!\n\nI tried to capture that conversational yet professional tone we discussed.\n\nLisa',
        timestamp: daysAgo(3),
        read: true,
        priority: 50,
        contactId: contacts[5].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'gmail-004',
        channel: 'gmail',
        from: contacts[8].email!,
        to: 'alex@example.com',
        subject: 'Office Supplies Order Confirmation',
        body: 'Dear Alex,\n\nYour order #12345 has been confirmed and will ship tomorrow.\n\nExpected delivery: February 25, 2026\n\nThank you for your business!\n\nMichael Brown\nSupplies Co.',
        timestamp: daysAgo(2),
        read: true,
        priority: 30,
        contactId: contacts[8].id,
      },
    }),
    // WhatsApp messages
    prisma.message.create({
      data: {
        externalId: 'whatsapp-001',
        channel: 'whatsapp',
        from: contacts[1].whatsappId!,
        to: '+15145551234',
        subject: null,
        body: 'Salut Alex! Les travaux avancent bien. Par contre, on a un petit problème avec la plomberie. Ça va coûter 500$ de plus. Tu es OK?',
        timestamp: hoursAgo(5),
        read: false,
        priority: 75,
        threadId: conversations[1].id,
        contactId: contacts[1].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'whatsapp-002',
        channel: 'whatsapp',
        from: contacts[1].whatsappId!,
        to: '+15145551234',
        subject: null,
        body: 'Aussi, je vais avoir besoin du paiement pour cette semaine avant vendredi. Merci!',
        timestamp: hoursAgo(4),
        read: false,
        priority: 80,
        threadId: conversations[1].id,
        contactId: contacts[1].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'whatsapp-003',
        channel: 'whatsapp',
        from: contacts[7].whatsappId!,
        to: '+15145551234',
        subject: null,
        body: 'Hey! Are you coming to the networking event next week? Would love to catch up!',
        timestamp: daysAgo(4),
        read: true,
        priority: 40,
        contactId: contacts[7].id,
      },
    }),
    // Telegram messages
    prisma.message.create({
      data: {
        externalId: 'telegram-001',
        channel: 'telegram',
        from: contacts[2].telegramId!,
        to: '@alexuser',
        subject: null,
        body: 'Alex, fantastic progress on the platform! The demo yesterday was impressive. I\'d like to discuss increasing our investment. Can we talk this week?',
        timestamp: hoursAgo(1),
        read: false,
        priority: 95,
        threadId: conversations[2].id,
        contactId: contacts[2].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'telegram-002',
        channel: 'telegram',
        from: contacts[2].telegramId!,
        to: '@alexuser',
        subject: null,
        body: 'Also wanted to introduce you to someone from our portfolio. I think there could be great synergy.',
        timestamp: hoursAgo(1),
        read: false,
        priority: 85,
        threadId: conversations[2].id,
        contactId: contacts[2].id,
      },
    }),
    // Slack messages
    prisma.message.create({
      data: {
        externalId: 'slack-001',
        channel: 'slack',
        from: contacts[0].slackId!,
        to: '@alex',
        subject: null,
        body: 'Hey Alex! Just uploaded the latest mockups to Figma. The new color palette looks amazing. Need your feedback before I proceed with the rest of the pages.',
        timestamp: hoursAgo(3),
        read: false,
        priority: 75,
        threadId: conversations[0].id,
        contactId: contacts[0].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'slack-002',
        channel: 'slack',
        from: contacts[0].slackId!,
        to: '@alex',
        subject: null,
        body: 'BTW, do you prefer the serif or sans-serif font for headings? I\'m leaning towards serif but want to make sure we\'re aligned.',
        timestamp: hoursAgo(3),
        read: false,
        priority: 60,
        threadId: conversations[0].id,
        contactId: contacts[0].id,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'slack-003',
        channel: 'slack',
        from: contacts[4].slackId!,
        to: '@alex',
        subject: null,
        body: 'Morning! Quick question about the API integration. Do we need OAuth or is API key auth sufficient for the MVP?',
        timestamp: hoursAgo(6),
        read: true,
        priority: 65,
        threadId: conversations[4].id,
        contactId: contacts[4].id,
        aiDraft: 'Hey David! For the MVP, API key authentication should be sufficient. We can implement OAuth in phase 2 once we have more users.\n\nLet me know if you need any clarification!\n\nBest,\nAlex',
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'slack-004',
        channel: 'slack',
        from: contacts[4].slackId!,
        to: '@alex',
        subject: null,
        body: 'Perfect, that makes sense. Will go with API keys then. Should have the first version ready for testing by EOD.',
        timestamp: hoursAgo(5),
        read: true,
        priority: 55,
        threadId: conversations[4].id,
        contactId: contacts[4].id,
      },
    }),
    // More varied messages
    prisma.message.create({
      data: {
        externalId: 'gmail-005',
        channel: 'gmail',
        from: 'notifications@linkedin.com',
        to: 'alex@example.com',
        subject: 'You have 5 new connection requests',
        body: 'People are trying to connect with you on LinkedIn...',
        timestamp: hoursAgo(12),
        read: true,
        priority: 20,
      },
    }),
    prisma.message.create({
      data: {
        externalId: 'gmail-006',
        channel: 'gmail',
        from: contacts[3].email!,
        to: 'alex@example.com',
        subject: 'Re: Campaign Launch Deadline',
        body: 'Je suis disponible demain à 14h pour un appel. Ça te convient?\n\nAmélie',
        timestamp: daysAgo(2),
        read: true,
        priority: 70,
        threadId: conversations[3].id,
        contactId: contacts[3].id,
      },
    }),
  ]);

  console.log(`✅ Created ${messages.length} messages`);
  console.log('🤖 Creating AI metadata...');

  // Create AI metadata for some messages
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
          'Provide final approval by Friday'
        ]),
      },
    }),
    prisma.aIMetadata.create({
      data: {
        messageId: messages[1].id,
        priorityScore: 70,
        priorityReason: 'Contains keyword: "payment"; Contains keyword: "invoice"; Known contact (Robert Gagnon); gmail channel (+5)',
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
          'Confirm payment by Friday'
        ]),
      },
    }),
    prisma.aIMetadata.create({
      data: {
        messageId: messages[7].id,
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

  // Create calendar events
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(14, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(10, 0, 0, 0);

  await Promise.all([
    prisma.calendarEvent.create({
      data: {
        title: 'Campaign Review Call with Amélie',
        startTime: tomorrow,
        endTime: new Date(tomorrow.getTime() + 60 * 60 * 1000), // 1 hour
        attendees: JSON.stringify([contacts[3].email]),
        contactId: contacts[3].id,
        location: 'Zoom',
        briefing: 'Review Q1 campaign creative assets and finalize launch timeline.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Investment Discussion - James Wilson',
        startTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
        endTime: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 1.5 hours
        attendees: JSON.stringify([contacts[2].email, 'partner@techventures.com']),
        contactId: contacts[2].id,
        location: 'Coffee Lab, Downtown',
        briefing: 'Discuss increased investment and potential introduction to portfolio company.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Site Visit - Office Renovation',
        startTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 2 hours
        attendees: JSON.stringify([contacts[1].email]),
        contactId: contacts[1].id,
        location: 'Office - 123 Main St',
        briefing: 'Walk-through of renovation progress. Discuss plumbing issue and payment.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Design Review - Sarah Chen',
        startTime: nextWeek,
        endTime: new Date(nextWeek.getTime() + 90 * 60 * 1000),
        attendees: JSON.stringify([contacts[0].email]),
        contactId: contacts[0].id,
        location: 'Design Studio Office',
        briefing: 'Review final website mockups and approve design direction.',
      },
    }),
    prisma.calendarEvent.create({
      data: {
        title: 'Platform Demo - Development Team',
        startTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
        endTime: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        attendees: JSON.stringify([contacts[4].email, 'team@devteam.io']),
        contactId: contacts[4].id,
        location: 'Virtual - Google Meet',
        briefing: 'Demo of MVP features and API integration.',
      },
    }),
  ]);

  console.log('✅ Created calendar events');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
