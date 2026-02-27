# Unified Inbox

A unified messaging inbox that aggregates Beeper (Matrix/Slack/WhatsApp/Telegram/Gmail) into a single AI-assisted interface.

## Features

- **Multi-channel inbox** — Slack, WhatsApp, Telegram, Gmail displayed side-by-side
- **Beeper integration** — syncs messages via the Beeper Matrix bridge; avatar `mxc://` URIs resolved to Beeper media thumbnails
- **AI features** — per-conversation summaries, priority scoring, AI-generated draft replies, daily briefing
- **Smart grouping** — messages grouped into conversations by `conversationId` or sender + channel
- **Slack-style thread panel** — thread replies open in a right-side panel, same UX as Slack
- **Group conversation avatars** — 2×2 member face collage (like Beeper)
- **Persistent read state** — unread/read status survives page refreshes via `localStorage`
- **Priority highlighting** — high-priority conversations get a coloured left-border accent
- **Multi-user auth** — session-cookie auth with per-workspace Beeper connections

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | SQLite via Prisma + better-sqlite3 |
| Styling | Tailwind CSS v4 |
| Auth | Custom session cookies (scrypt password hashing) |
| AI | Anthropic Claude API |
| Messaging sync | Beeper Matrix bridge |
| Tests | Vitest + Testing Library |

## Getting Started

### Prerequisites

- Node.js 20+
- A Beeper account (optional — mock data is used as fallback)
- An Anthropic API key (optional — AI features degrade gracefully)

### Setup

```bash
npm install

# Create the SQLite database and run migrations
npm run db:push

# Seed with a demo user (check prisma/seed.ts for credentials)
npm run db:seed

# Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
Default demo credentials are set in `prisma/seed.ts`.

### Environment Variables

Create a `.env` file in the project root:

```env
# Optional — AI features (summary, draft replies, briefing)
ANTHROPIC_API_KEY=sk-ant-...

# Optional — set automatically after connecting Beeper in Settings
BEEPER_ACCESS_TOKEN=...
```

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, AI, Beeper sync, conversations)
│   ├── login/         # Login page
│   └── (pages)/       # Inbox, briefing, calendar, contacts, settings
├── components/
│   ├── inbox/         # ConversationList, ConversationDetail, types
│   └── (shared)/      # Avatar, GroupAvatar, PlatformLogo, ChannelBadge…
├── hooks/
│   └── useInboxState.ts  # All inbox state management
└── lib/
    ├── auth.ts         # Session management, password hashing
    ├── data.ts         # DB queries with mock-data fallback
    ├── mockData.ts     # Type definitions + demo data
    └── services/       # BeeperService, SyncEngine, AI helpers
```

## Running Tests

```bash
npm test            # run once
npm run test:watch  # watch mode
```

Tests cover:
- `src/lib/data.test.ts` — `formatContactName`, `inferTopic`, `getTopicColor`
- `src/lib/auth.test.ts` — `hashPassword`, `verifyPassword`, `AuthError`
- `src/lib/mockData.test.ts` — `getRelativeTime`
- `src/hooks/useInboxState.test.ts` — conversation grouping, filtering, sorting, read state, archive

## Connecting Beeper

1. Log in and navigate to **Settings**
2. Click **Connect Beeper** — you'll be redirected to authorise your Beeper account
3. After approval the callback stores your access token and triggers an initial sync
4. Use **POST /api/sync** (or the Sync button in Settings) to pull new messages manually
