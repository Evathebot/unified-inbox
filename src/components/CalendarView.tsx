'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarPlus } from 'lucide-react';
import CalendarEventCard from '@/components/CalendarEvent';
import GlassCard from '@/components/GlassCard';
import type { CalendarEvent } from '@/lib/mockData';

interface CalendarViewProps {
  events: CalendarEvent[];
}

export default function CalendarView({ events }: CalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState(events[0]);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay() + weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    return date;
  });

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(weekStart.getDate() + 6);
    return `${formatDate(weekStart)} - ${formatDate(end)}`;
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Calendar</h1>
            <p className="text-gray-500">{formatWeekRange()}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="p-2 rounded-lg bg-white hover:bg-gray-50 transition-all border border-gray-200"
            >
              <ChevronLeft size={20} className="text-gray-600" />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-4 py-2 rounded-lg bg-white hover:bg-gray-50 transition-all border border-gray-200 text-gray-700 text-sm font-medium"
            >
              Today
            </button>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="p-2 rounded-lg bg-white hover:bg-gray-50 transition-all border border-gray-200"
            >
              <ChevronRight size={20} className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {weekDays.map((day) => {
                const dayEvents = events.filter(
                  (event) => event.startTime.toDateString() === day.toDateString()
                );

                const isToday = day.toDateString() === today.toDateString();

                return (
                  <div key={day.toISOString()}>
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`
                        w-12 h-12 rounded-xl flex flex-col items-center justify-center
                        ${isToday ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}
                      `}
                      >
                        <span className="text-xs uppercase font-medium">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold">{day.getDate()}</span>
                      </div>
                      <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {dayEvents.length > 0 ? (
                      <div className="space-y-3 ml-0 lg:ml-4">
                        {dayEvents.map((event) => (
                          <CalendarEventCard
                            key={event.id}
                            event={event}
                            onClick={() => setSelectedEvent(event)}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-sm ml-0 lg:ml-4 mb-4">No events</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Detail Sidebar */}
          <div className="lg:col-span-1">
            {events.length === 0 && (
              <div className="sticky top-6">
                <GlassCard className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CalendarPlus size={24} className="text-blue-500" />
                  </div>
                  <h3 className="text-gray-900 font-semibold mb-2">No calendar connected</h3>
                  <p className="text-gray-500 text-sm mb-4 leading-relaxed">
                    Sync Beeper Desktop to pull in your calendar events, or connect a calendar in Settings.
                  </p>
                  <a
                    href="/settings"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors font-medium"
                  >
                    Go to Settings
                  </a>
                </GlassCard>
              </div>
            )}
            {events.length > 0 && selectedEvent && (
              <div className="sticky top-6">
                <GlassCard className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedEvent.title}</h2>

                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Date & Time</p>
                      <p className="text-gray-900 text-sm">
                        {selectedEvent.startTime.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {selectedEvent.startTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        -{' '}
                        {selectedEvent.endTime.toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Attendees</p>
                      <div className="space-y-1">
                        {selectedEvent.attendees.map((attendee, idx) => (
                          <p key={idx} className="text-gray-700 text-sm">
                            {attendee}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Brief */}
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="ai-orb relative" style={{width: 20, height: 20}}>
                        <div className="ai-orb-glow"></div>
                      </div>
                      <p className="ai-text-gradient text-sm font-semibold">AI Meeting Brief</p>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{selectedEvent.brief}</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 space-y-2">
                    <button className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all text-sm font-medium">
                      Join Meeting
                    </button>
                    <button className="w-full px-4 py-2.5 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-all border border-gray-200 text-sm font-medium">
                      View Details
                    </button>
                  </div>
                </GlassCard>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
