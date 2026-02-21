import InboxView from '@/components/InboxView';
import { getMessages } from '@/lib/data';

export default async function InboxPage() {
  // Fetch messages from database with fallback to mock data
  const messages = await getMessages();

  return <InboxView initialMessages={messages} />;
}
