import CalendarView from '@/components/CalendarView';
import { getCalendarEvents } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  // Fetch calendar events from database with fallback to mock data
  const events = await getCalendarEvents();

  return <CalendarView events={events} />;
}
