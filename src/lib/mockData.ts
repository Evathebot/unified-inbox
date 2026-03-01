export type Channel = 'gmail' | 'whatsapp' | 'telegram' | 'slack';

export interface ChannelContext {
  workspace?: string;    // e.g. "DarkHorse Inc." (Slack workspace), "Family Group" (WhatsApp group)
  channelName?: string;  // e.g. "#engineering", "#general"
  isDM?: boolean;        // Direct message vs group/channel
  groupName?: string;    // WhatsApp group name
}

export interface Message {
  id: string;
  channel: Channel;
  channelContext?: ChannelContext;
  sender: {
    name: string;
    avatar: string;
    online: boolean;
  };
  subject?: string;
  preview: string;       // ≤150-char snippet used in conversation list rows
  body?: string;         // full message body used in conversation detail view
  externalId?: string;   // Beeper conversation externalId (chat ID) for browser-side send
  timestamp: Date;
  priority: number;
  unread: boolean;
  answered: boolean;
  account: 'work' | 'personal';
  topicLabel?: string;
  topicColor?: string;
  hasAIDraft: boolean;
  thread?: {
    messages: {
      from: string;
      content: string;
      timestamp: Date;
    }[];
  };
  aiDraft?: string;
  // Conversation grouping
  conversationId?: string;
  conversationTitle?: string;
  isGroupConversation?: boolean;
  /** Beeper system events: tapbacks, renames, group-photo changes, etc. */
  isSystemEvent?: boolean;
  /** Message type: text, image, voice, file, video, system */
  messageType?: string;
}

export interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  location: string;
  avatar: string;
  avatarUrl?: string;
  channels: Channel[];
  allPlatforms: string[];
  relationshipScore: number;
  lastInteraction: Date;
  bio: string;
  personality: {
    communicationStyle: string;
    decisionMaking: string;
    preferredLanguage: string;
    interests: string[];
    bestTimeToReach: string;
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  brief: string;
}

export interface BriefingData {
  greeting: string;
  date: string;
  priorityMessages: Message[];
  overdueReplies: Message[];
  calendarEvents: CalendarEvent[];
  actionItems: string[];
  stats: {
    messagesToday: number;
    unreadCount?: number;
    overdueCount?: number;
  };
}

// Mock Messages
export const mockMessages: Message[] = [
  {
    id: '1',
    channel: 'gmail',
    sender: { name: 'Sarah Chen', avatar: '👩‍💼', online: true },
    subject: 'Q1 Budget Review - Urgent',
    preview: 'Hi Alex, I need your approval on the Q1 budget before tomorrow\'s board meeting. The revised projections show...',
    timestamp: new Date(Date.now() - 2 * 60 * 1000),
    priority: 95,
    unread: true,
    answered: false,
    account: 'work',
    topicLabel: 'Financial Review',
    topicColor: 'bg-red-100 text-red-700',
    hasAIDraft: true,
    thread: {
      messages: [
        { from: 'Sarah Chen', content: 'Hi Alex, I need your approval on the Q1 budget before tomorrow\'s board meeting. The revised projections show a 12% increase in operational costs due to the new hires. Can you review the attached spreadsheet?', timestamp: new Date(Date.now() - 2 * 60 * 1000) }
      ]
    },
    aiDraft: 'Thanks Sarah! I\'ve reviewed the projections and they look reasonable given our growth. Approved for the board meeting. Let\'s discuss the operational cost optimization strategies next week.'
  },
  {
    id: '2',
    channel: 'whatsapp',
    sender: { name: 'Marcus Rodriguez', avatar: '👨‍💻', online: true },
    preview: 'The deployment is stuck. Database migration failed on production. Need your call ASAP 🚨',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    priority: 98,
    unread: true,
    answered: false,
    account: 'work',
    topicLabel: 'Incident Response',
    topicColor: 'bg-orange-100 text-orange-700',
    hasAIDraft: true,
    thread: {
      messages: [
        { from: 'Marcus Rodriguez', content: 'The deployment is stuck. Database migration failed on production. Need your call ASAP 🚨', timestamp: new Date(Date.now() - 5 * 60 * 1000) }
      ]
    },
    aiDraft: 'On it! Calling you in 2 minutes. Roll back to the previous version first to keep the site stable.'
  },
  {
    id: '3',
    channel: 'telegram',
    sender: { name: 'Emily Foster', avatar: '🎨', online: false },
    preview: 'The new brand guidelines are ready for review. I\'ve incorporated all your feedback from last week...',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    priority: 65,
    unread: true,
    answered: false,
    account: 'work',
    topicLabel: 'Brand Design',
    topicColor: 'bg-purple-100 text-purple-700',
    hasAIDraft: true,
    thread: {
      messages: [
        { from: 'Emily Foster', content: 'The new brand guidelines are ready for review. I\'ve incorporated all your feedback from last week. Check the Figma link when you have a moment!', timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000) }
      ]
    },
    aiDraft: 'Amazing work, Emily! I\'ll review the guidelines this afternoon and get back to you with final notes by EOD.'
  },
  {
    id: '4',
    channel: 'slack',
    sender: { name: 'David Kim', avatar: '📊', online: true },
    preview: 'Quick question about the analytics dashboard - which metrics should we prioritize for the exec demo?',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    priority: 55,
    unread: false,
    answered: true,
    account: 'work',
    topicLabel: 'Analytics',
    topicColor: 'bg-blue-100 text-blue-700',
    hasAIDraft: false,
    thread: {
      messages: [
        { from: 'David Kim', content: 'Quick question about the analytics dashboard - which metrics should we prioritize for the exec demo?', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) }
      ]
    }
  },
  {
    id: '5',
    channel: 'gmail',
    sender: { name: 'Jennifer Wu', avatar: '⚖️', online: false },
    subject: 'Contract Review - TechCorp Partnership',
    preview: 'Please review the updated terms for the TechCorp partnership. Legal has flagged sections 4.2 and 7.1...',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    priority: 78,
    unread: true,
    answered: false,
    account: 'work',
    topicLabel: 'Legal Review',
    topicColor: 'bg-amber-100 text-amber-700',
    hasAIDraft: true,
    thread: {
      messages: [
        { from: 'Jennifer Wu', content: 'Please review the updated terms for the TechCorp partnership. Legal has flagged sections 4.2 and 7.1 regarding data sharing and liability. Your input is needed before we can proceed.', timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) }
      ]
    },
    aiDraft: 'Thanks Jennifer. I\'ll review sections 4.2 and 7.1 today. Can we schedule a call tomorrow morning to discuss the liability clauses?'
  },
  {
    id: '6',
    channel: 'whatsapp',
    sender: { name: 'Alex Thompson', avatar: '🎯', online: true },
    preview: 'Confirmed for lunch tomorrow at 12:30! The new Italian place downtown 🍝',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    priority: 25,
    unread: false,
    answered: true,
    account: 'personal',
    topicLabel: 'Social',
    topicColor: 'bg-green-100 text-green-700',
    hasAIDraft: false,
    thread: {
      messages: [
        { from: 'Alex Thompson', content: 'Confirmed for lunch tomorrow at 12:30! The new Italian place downtown 🍝', timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) }
      ]
    }
  },
  {
    id: '7',
    channel: 'telegram',
    sender: { name: 'Nina Patel', avatar: '🚀', online: true },
    preview: 'The investor deck looks fantastic! A few minor tweaks on slides 8-10 and we\'re good to go.',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    priority: 70,
    unread: true,
    answered: false,
    account: 'work',
    topicLabel: 'Investor Update',
    topicColor: 'bg-emerald-100 text-emerald-700',
    hasAIDraft: true,
    thread: {
      messages: [
        { from: 'Nina Patel', content: 'The investor deck looks fantastic! A few minor tweaks on slides 8-10 and we\'re good to go.', timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000) }
      ]
    },
    aiDraft: 'Great! Send me the specific changes you\'d like and I\'ll update the deck this evening.'
  },
  {
    id: '8',
    channel: 'slack',
    sender: { name: 'Robert Hayes', avatar: '💼', online: false },
    preview: 'Team standup notes from this morning - action items assigned. Check #engineering channel.',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    priority: 40,
    unread: false,
    answered: true,
    account: 'work',
    topicLabel: 'Engineering',
    topicColor: 'bg-slate-100 text-slate-700',
    hasAIDraft: false,
    thread: {
      messages: [
        { from: 'Robert Hayes', content: 'Team standup notes from this morning - action items assigned. Check #engineering channel.', timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) }
      ]
    }
  },
  {
    id: '9',
    channel: 'gmail',
    sender: { name: 'Lisa Morgan', avatar: '📱', online: true },
    subject: 'Product Roadmap Q2 2026',
    preview: 'Attaching the draft roadmap for Q2. Would love your thoughts on prioritization, especially the AI features...',
    timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000),
    priority: 72,
    unread: true,
    answered: false,
    account: 'work',
    topicLabel: 'Product Strategy',
    topicColor: 'bg-indigo-100 text-indigo-700',
    hasAIDraft: true,
    thread: {
      messages: [
        { from: 'Lisa Morgan', content: 'Attaching the draft roadmap for Q2. Would love your thoughts on prioritization, especially the AI features we discussed last month.', timestamp: new Date(Date.now() - 20 * 60 * 60 * 1000) }
      ]
    },
    aiDraft: 'Thanks Lisa! The roadmap looks solid. I\'d prioritize the AI-powered search feature first, then the automation workflows. Let\'s sync on Thursday to finalize.'
  },
  {
    id: '10',
    channel: 'whatsapp',
    sender: { name: 'Chris Anderson', avatar: '🏋️', online: false },
    preview: 'Gym session tomorrow morning at 6:30? 💪',
    timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000),
    priority: 20,
    unread: false,
    answered: true,
    account: 'personal',
    topicLabel: 'Fitness',
    topicColor: 'bg-teal-100 text-teal-700',
    hasAIDraft: false,
    thread: {
      messages: [
        { from: 'Chris Anderson', content: 'Gym session tomorrow morning at 6:30? 💪', timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000) }
      ]
    }
  }
];

// Mock Contacts
export const mockContacts: Contact[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    company: 'FinTech Innovations',
    role: 'CFO',
    location: 'New York',
    avatar: '👩‍💼',
    avatarUrl: 'https://i.pravatar.cc/150?img=1',
    channels: ['gmail', 'slack'],
    allPlatforms: ['gmail', 'slack', 'linkedin'],
    relationshipScore: 92,
    lastInteraction: new Date(Date.now() - 2 * 60 * 1000),
    bio: 'Sarah Chen is CFO at FinTech Innovations, a fast-growing financial technology company in New York. With over 15 years of experience in corporate finance, she specializes in strategic planning and financial modeling. She communicates in a direct, data-driven style and prefers structured bullet points over lengthy emails. Your relationship spans 2 years with frequent collaboration on budgets and quarterly reviews.',
    personality: {
      communicationStyle: 'Direct and data-driven. Prefers bullet points and clear action items.',
      decisionMaking: 'Analytical. Needs detailed financial projections before approving decisions.',
      preferredLanguage: 'English, occasionally Mandarin for informal conversations',
      interests: ['Financial modeling', 'Opera', 'Marathon running'],
      bestTimeToReach: 'Weekday mornings 8-10 AM EST'
    }
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    company: 'DevOps Solutions',
    role: 'Lead Engineer',
    location: 'Austin',
    avatar: '👨‍💻',
    avatarUrl: 'https://i.pravatar.cc/150?img=3',
    channels: ['whatsapp', 'slack', 'telegram'],
    allPlatforms: ['whatsapp', 'slack', 'telegram', 'gmail'],
    relationshipScore: 88,
    lastInteraction: new Date(Date.now() - 5 * 60 * 1000),
    bio: 'Marcus Rodriguez is the Lead Engineer at DevOps Solutions, known for his expertise in cloud infrastructure and CI/CD pipelines. Based in Austin, he\'s a night owl who prefers fast-paced, emoji-filled communication. He\'s your go-to for production incidents and has been a trusted technical partner for over 18 months.',
    personality: {
      communicationStyle: 'Fast-paced and technical. Uses lots of emojis and GIFs.',
      decisionMaking: 'Instinctive. Trusts his technical gut but values team input.',
      preferredLanguage: 'English, Spanish for casual chat',
      interests: ['Open source', 'Coffee brewing', 'Cybersecurity'],
      bestTimeToReach: 'Late evenings 8-11 PM EST (night owl)'
    }
  },
  {
    id: '3',
    name: 'Emily Foster',
    company: 'Creative Studio X',
    role: 'Creative Director',
    location: 'London',
    avatar: '🎨',
    avatarUrl: 'https://i.pravatar.cc/150?img=5',
    channels: ['telegram', 'gmail'],
    allPlatforms: ['telegram', 'gmail', 'instagram', 'linkedin'],
    relationshipScore: 85,
    lastInteraction: new Date(Date.now() - 1 * 60 * 60 * 1000),
    bio: 'Emily Foster is the Creative Director at Creative Studio X in London. She brings a unique blend of contemporary art sensibility and brand strategy to every project. Known for sharing mood boards and design references, Emily has been your creative partner on branding and visual identity work for the past year.',
    personality: {
      communicationStyle: 'Visual and expressive. Loves sharing design references and mood boards.',
      decisionMaking: 'Intuitive. Relies on aesthetics and brand alignment.',
      preferredLanguage: 'English',
      interests: ['Contemporary art', 'Typography', 'Sustainable design'],
      bestTimeToReach: 'Afternoons 2-5 PM EST'
    }
  },
  {
    id: '4',
    name: 'David Kim',
    company: 'DataViz Corp',
    role: 'Analytics Manager',
    location: 'San Francisco',
    avatar: '📊',
    avatarUrl: 'https://i.pravatar.cc/150?img=8',
    channels: ['slack', 'gmail'],
    allPlatforms: ['slack', 'gmail', 'linkedin'],
    relationshipScore: 79,
    lastInteraction: new Date(Date.now() - 2 * 60 * 60 * 1000),
    bio: 'David Kim manages analytics at DataViz Corp in San Francisco. He\'s methodical and evidence-based, always backing decisions with data. Your collaboration focuses on dashboard metrics and executive presentations. He\'s been instrumental in shaping your data strategy.',
    personality: {
      communicationStyle: 'Methodical and detailed. Loves dashboards and visual data.',
      decisionMaking: 'Evidence-based. Needs A/B test results and user metrics.',
      preferredLanguage: 'English, Korean with family',
      interests: ['Data visualization', 'Basketball', 'Korean BBQ'],
      bestTimeToReach: 'Mid-morning 10-12 PM EST'
    }
  },
  {
    id: '5',
    name: 'Jennifer Wu',
    company: 'Global Law Partners',
    role: 'Senior Counsel',
    location: 'Boston',
    avatar: '⚖️',
    avatarUrl: 'https://i.pravatar.cc/150?img=10',
    channels: ['gmail'],
    allPlatforms: ['gmail', 'linkedin'],
    relationshipScore: 91,
    lastInteraction: new Date(Date.now() - 3 * 60 * 60 * 1000),
    bio: 'Jennifer Wu is Senior Counsel at Global Law Partners in Boston, specializing in tech partnerships and IP law. She\'s precise and thorough—every word in her communications is carefully chosen. Your working relationship has been critical for navigating contract negotiations and compliance requirements.',
    personality: {
      communicationStyle: 'Precise and formal. Every word matters.',
      decisionMaking: 'Risk-averse. Thoroughly evaluates legal implications.',
      preferredLanguage: 'English',
      interests: ['Contract law', 'Classical music', 'Golf'],
      bestTimeToReach: 'Weekday mornings 9-11 AM EST'
    }
  }
];

// Mock Calendar Events
export const mockCalendarEvents: CalendarEvent[] = [
  {
    id: '1',
    title: 'Board Meeting - Q1 Review',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
    attendees: ['Sarah Chen', 'Board Members'],
    brief: 'Key topics: Q1 financial performance (12% cost increase), new hire impact, Q2 projections. Sarah will present budget approval request. Be prepared to discuss operational cost optimization.'
  },
  {
    id: '2',
    title: 'Contract Discussion - TechCorp',
    startTime: new Date(Date.now() + 26 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 26 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
    attendees: ['Jennifer Wu', 'Legal Team'],
    brief: 'Review sections 4.2 (data sharing) and 7.1 (liability) of partnership agreement. Jennifer flagged concerns. Prepare questions about risk mitigation and data protection compliance.'
  },
  {
    id: '3',
    title: 'Product Roadmap Sync',
    startTime: new Date(Date.now() + 72 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 72 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000),
    attendees: ['Lisa Morgan', 'Product Team'],
    brief: 'Finalize Q2 2026 roadmap. Lisa suggests prioritizing AI-powered search, then automation workflows. Discussion points: resource allocation, timeline feasibility, competitive analysis.'
  },
  {
    id: '4',
    title: 'Lunch with Alex Thompson',
    startTime: new Date(Date.now() + 28 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 28 * 60 * 60 * 1000 + 1.5 * 60 * 60 * 1000),
    attendees: ['Alex Thompson'],
    brief: 'Casual lunch at new Italian restaurant downtown. Good opportunity to discuss potential collaboration on upcoming project. Alex mentioned interest in AI applications last month.'
  },
  {
    id: '5',
    title: 'Engineering Standup',
    startTime: new Date(Date.now() + 15 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + 15 * 60 * 60 * 1000 + 0.5 * 60 * 60 * 1000),
    attendees: ['Marcus Rodriguez', 'Engineering Team'],
    brief: 'Daily sync. Current blocker: production database migration failure. Marcus needs guidance on rollback vs. fix-forward approach. Team morale good despite deployment issues.'
  }
];

// Mock Briefing Data
export const mockBriefing: BriefingData = {
  greeting: 'Good morning, Alex',
  date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
  priorityMessages: mockMessages.filter(m => m.priority >= 70).slice(0, 5),
  overdueReplies: mockMessages.filter(m => m.unread && Date.now() - m.timestamp.getTime() > 24 * 60 * 60 * 1000),
  calendarEvents: mockCalendarEvents.slice(0, 3),
  actionItems: [
    'Review and approve Q1 budget for board meeting (Sarah Chen)',
    'Call Marcus about production deployment issue',
    'Review TechCorp contract sections 4.2 and 7.1 (Jennifer Wu)',
    'Provide feedback on brand guidelines (Emily Foster)',
    'Update investor deck slides 8-10 (Nina Patel)'
  ],
  stats: {
    messagesToday: 23,
    unreadCount: 12,
    overdueCount: 4,
  }
};

// Helper function to get relative time
export function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}
