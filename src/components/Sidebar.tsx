import { Suspense } from 'react';
import SidebarClient from './SidebarClient';
import { getUnreadCountsByChannel } from '@/lib/data';

// Async server component — fetches real unread counts from DB,
// then hands them to the client component for rendering.
export default async function Sidebar() {
  const badgeCounts = await getUnreadCountsByChannel();

  return (
    <Suspense fallback={<div className="h-screen w-16 bg-white border-r border-gray-200" />}>
      <SidebarClient badgeCounts={badgeCounts} />
    </Suspense>
  );
}
