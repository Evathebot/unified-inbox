import { Suspense } from 'react';
import InboxView from '@/components/InboxView';
import { getMessages } from '@/lib/data';

// Always render fresh from DB on every request — never use the Full Route Cache.
export const dynamic = 'force-dynamic';

export default async function InboxPage() {
  const messages = await getMessages();

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>}>
      <InboxView initialMessages={messages} />
    </Suspense>
  );
}
