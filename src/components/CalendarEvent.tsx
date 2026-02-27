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
        <div className="flex flex-col items-center justify-center bg-orange-50 rounded-lg p-3 shrink-0 min-w-[52px]">
          <span className="text-[10px] text-gray-500 uppercase font-medium">
            {event.startTime.toLocaleDateString('en-US', { month: 'short' })}
          </span>
          <span className="text-xl font-bold text-gray-900">
            {event.startTime.getDate()}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-gray-900 font-semibold text-sm mb-1.5">{event.title}</h3>
          
          <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users size={12} />
              <span>{event.attendees.length}</span>
            </div>
          </div>

          <p className="text-xs text-gray-400 line-clamp-2">
            {event.brief}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
