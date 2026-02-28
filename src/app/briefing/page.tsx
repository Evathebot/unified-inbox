import { AlertCircle, Clock, Calendar, CheckSquare, Inbox } from 'lucide-react';
import BriefingCard from '@/components/BriefingCard';
import MessageCard from '@/components/MessageCard';
import CalendarEventCard from '@/components/CalendarEvent';
import BriefingAISummary from '@/components/BriefingAISummary';
import BriefingGreeting from '@/components/BriefingGreeting';
import { getBriefing } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function BriefingPage() {
  const briefing = await getBriefing();

  const stats = [
    {
      label: 'Messages Today',
      value: briefing.stats.messagesToday,
      icon: Inbox,
      color: 'text-purple-400',
    },
    {
      label: 'Unread',
      value: briefing.stats.unreadCount ?? 0,
      icon: AlertCircle,
      color: 'text-red-400',
    },
    {
      label: 'Overdue Replies',
      value: briefing.stats.overdueCount ?? briefing.overdueReplies.length,
      icon: Clock,
      color: 'text-orange-400',
    },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section — client component for correct local timezone */}
        <BriefingGreeting />

        {/* AI Daily Summary — loaded client-side */}
        <BriefingAISummary
          priorityCount={briefing.priorityMessages.length}
          overdueCount={briefing.overdueReplies.length}
          calendarCount={briefing.calendarEvents.length}
          topSenders={briefing.priorityMessages.slice(0, 3).map(m => m.sender.name)}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-100 shadow-sm rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <Icon className={color} size={20} />
                <p className="text-gray-500 text-sm">{label}</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Messages */}
          <BriefingCard title="Priority Messages" icon={AlertCircle} iconColor="text-red-400">
            <div className="space-y-3">
              {briefing.priorityMessages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
              {briefing.priorityMessages.length === 0 && (
                <p className="text-gray-500 text-center py-4">No priority messages 🎉</p>
              )}
            </div>
          </BriefingCard>

          {/* Overdue Replies */}
          <BriefingCard title="Overdue Replies" icon={Clock} iconColor="text-orange-400">
            <div className="space-y-3">
              {briefing.overdueReplies.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
              {briefing.overdueReplies.length === 0 && (
                <p className="text-gray-500 text-center py-4">You&apos;re all caught up! 🎉</p>
              )}
            </div>
          </BriefingCard>

          {/* Today's Calendar */}
          <BriefingCard title="Today's Calendar" icon={Calendar} iconColor="text-blue-400">
            <div className="space-y-3">
              {briefing.calendarEvents.map((event) => (
                <CalendarEventCard key={event.id} event={event} />
              ))}
              {briefing.calendarEvents.length === 0 && (
                <p className="text-gray-500 text-center py-4">No events scheduled today</p>
              )}
            </div>
          </BriefingCard>

          {/* Action Items */}
          <BriefingCard title="Action Items" icon={CheckSquare} iconColor="text-green-400">
            <div className="space-y-2">
              {briefing.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <div className="w-5 h-5 rounded border-2 border-gray-300 shrink-0 mt-0.5" />
                  <p className="text-gray-600 text-sm flex-1">{item}</p>
                </div>
              ))}
              {briefing.actionItems.length === 0 && (
                <p className="text-gray-500 text-center py-4">No action items extracted</p>
              )}
            </div>
          </BriefingCard>
        </div>
      </div>
    </div>
  );
}
