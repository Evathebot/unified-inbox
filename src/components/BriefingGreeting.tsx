'use client';

import { useMemo } from 'react';

/**
 * Renders the daily greeting and date using the client's local timezone.
 *
 * The Briefing page is a server component, so its `getBriefing()` call uses
 * the server's UTC clock — which can show "Good afternoon" at 8 am PST.
 * This client component computes both values in the user's browser timezone.
 */
export default function BriefingGreeting() {
  const { greeting, date } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const g = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const d = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return { greeting: g, date: d };
  }, []);

  return (
    <div className="mb-6">
      <h1 className="text-5xl font-bold text-gray-900 mb-1">{greeting}</h1>
      <p className="text-xl text-gray-500">{date}</p>
    </div>
  );
}
