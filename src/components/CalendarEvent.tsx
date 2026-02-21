import { Clock, Users } from 'lucide-react';
import { CalendarEvent } from '@/lib/mockData';
import GlassCard from './GlassCard';

interface CalendarEventProps {
  event: CalendarEvent;
  onClick?: () => void;
}

export default function CalendarEventCard({ event, onClick }: CalendarEventProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <GlassCard hover onClick={onClick} className="p-4">
      <div className="flex items-start gap-4">
        {/* Time indicator */}
        <div className="flex flex-col items-center justify-center bg-purple-500/20 rounded-lg p-3 shrink-0">
          <span className="text-xs text-purple-300 uppercase">
            {event.startTime.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-xl font-bold text-orange-500">
            {event.startTime.getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-semibold mb-2">{event.title}</h3>
          
          <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={14} />
              <span>{event.attendees.length} attendees</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 line-clamp-2">
            {event.brief}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
