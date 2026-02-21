import { AlertCircle, Clock, Calendar, CheckSquare, TrendingUp } from 'lucide-react';
import BriefingCard from '@/components/BriefingCard';
import MessageCard from '@/components/MessageCard';
import CalendarEventCard from '@/components/CalendarEvent';
import { getBriefing } from '@/lib/data';

export default async function BriefingPage() {
  // Fetch data from database with fallback to mock data
  const briefing = await getBriefing();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">{briefing.greeting}</h1>
          <p className="text-xl text-gray-400">{briefing.date}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-purple-400" size={20} />
              <p className="text-gray-400 text-sm">Messages Yesterday</p>
            </div>
            <p className="text-3xl font-bold text-white">{briefing.stats.messagesYesterday}</p>
          </div>

          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <CheckSquare className="text-green-400" size={20} />
              <p className="text-gray-400 text-sm">Response Rate</p>
            </div>
            <p className="text-3xl font-bold text-white">{briefing.stats.responseRate}%</p>
          </div>

          <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.08] rounded-xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-blue-400" size={20} />
              <p className="text-gray-400 text-sm">Avg Response Time</p>
            </div>
            <p className="text-3xl font-bold text-white">{briefing.stats.avgResponseTime}</p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Priority Messages */}
          <BriefingCard
            title="Priority Messages"
            icon={AlertCircle}
            iconColor="text-red-400"
          >
            <div className="space-y-3">
              {briefing.priorityMessages.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
              {briefing.priorityMessages.length === 0 && (
                <p className="text-gray-400 text-center py-4">No priority messages</p>
              )}
            </div>
          </BriefingCard>

          {/* Overdue Replies */}
          <BriefingCard
            title="Overdue Replies"
            icon={Clock}
            iconColor="text-orange-400"
          >
            <div className="space-y-3">
              {briefing.overdueReplies.map((message) => (
                <MessageCard key={message.id} message={message} />
              ))}
              {briefing.overdueReplies.length === 0 && (
                <p className="text-gray-400 text-center py-4">You're all caught up! 🎉</p>
              )}
            </div>
          </BriefingCard>

          {/* Today's Calendar */}
          <BriefingCard
            title="Today's Calendar"
            icon={Calendar}
            iconColor="text-blue-400"
          >
            <div className="space-y-3">
              {briefing.calendarEvents.map((event) => (
                <CalendarEventCard key={event.id} event={event} />
              ))}
              {briefing.calendarEvents.length === 0 && (
                <p className="text-gray-400 text-center py-4">No events scheduled</p>
              )}
            </div>
          </BriefingCard>

          {/* Action Items */}
          <BriefingCard
            title="Action Items"
            icon={CheckSquare}
            iconColor="text-green-400"
          >
            <div className="space-y-2">
              {briefing.actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <div className="w-5 h-5 rounded border-2 border-gray-500 shrink-0 mt-0.5"></div>
                  <p className="text-gray-300 text-sm flex-1">{item}</p>
                </div>
              ))}
              {briefing.actionItems.length === 0 && (
                <p className="text-gray-400 text-center py-4">No action items</p>
              )}
            </div>
          </BriefingCard>
        </div>

        {/* AI Insights */}
        <div className="mt-6">
          <BriefingCard
            title="AI Insights"
            icon={TrendingUp}
            iconColor="text-purple-400"
          >
            <div className="space-y-3 text-gray-300">
              <p className="leading-relaxed">
                📈 <strong>Communication Patterns:</strong> Your response rate has improved by 12% this week. 
                Most productive hours are between 9-11 AM.
              </p>
              <p className="leading-relaxed">
                🎯 <strong>Focus Recommendation:</strong> {briefing.priorityMessages.length > 0 
                  ? `${briefing.priorityMessages[0].sender.name}'s message (priority: ${briefing.priorityMessages[0].priority}) requires attention.`
                  : 'No high-priority items at this time.'}
              </p>
              <p className="leading-relaxed">
                💡 <strong>Relationship Tip:</strong> {briefing.overdueReplies.length > 0
                  ? `You have ${briefing.overdueReplies.length} overdue ${briefing.overdueReplies.length === 1 ? 'reply' : 'replies'}. Consider reaching out soon.`
                  : 'You\'re all caught up on your communications!'}
              </p>
            </div>
          </BriefingCard>
        </div>
      </div>
    </div>
  );
}
