import { Suspense } from 'react';
import InboxView from '@/components/InboxView';
import { getMessages } from '@/lib/data';

export default async function InboxPage() {
  const messages = await getMessages();

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading...</div>}>
      <InboxView initialMessages={messages} />
    </Suspense>
  );
}
