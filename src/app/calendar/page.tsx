'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import CalendarEventCard from '@/components/CalendarEvent';
import GlassCard from '@/components/GlassCard';
import { mockCalendarEvents } from '@/lib/mockData';

export default function CalendarPage() {
  const [selectedEvent, setSelectedEvent] = useState(mockCalendarEvents[0]);

  // Get current week
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

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
            <h1 className="text-4xl font-bold text-white mb-2">Calendar</h1>
            <p className="text-gray-400">{formatWeekRange()}</p>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] transition-all border border-white/[0.08]">
              <ChevronLeft size={20} className="text-white" />
            </button>
            <button className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] transition-all border border-white/[0.08] text-white">
              Today
            </button>
            <button className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] transition-all border border-white/[0.08]">
              <ChevronRight size={20} className="text-white" />
            </button>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Events List */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {/* Week View */}
              {weekDays.map((day) => {
                const dayEvents = mockCalendarEvents.filter(
                  event => event.startTime.toDateString() === day.toDateString()
                );

                const isToday = day.toDateString() === today.toDateString();

                return (
                  <div key={day.toISOString()}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`
                        w-12 h-12 rounded-xl flex flex-col items-center justify-center
                        ${isToday ? 'bg-purple-500 text-white' : 'bg-white/[0.06] text-gray-300'}
                      `}>
                        <span className="text-xs uppercase">
                          {day.toLocaleDateString('en-US', { weekday: 'short' })}
                        </span>
                        <span className="text-lg font-bold">{day.getDate()}</span>
                      </div>
                      <div className="flex-1 h-px bg-white/[0.08]"></div>
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
                      <p className="text-gray-500 text-sm ml-0 lg:ml-4 mb-4">No events</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event Detail Sidebar */}
          <div className="lg:col-span-1">
            {selectedEvent && (
              <div className="sticky top-6">
                <GlassCard className="p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    {selectedEvent.title}
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Date & Time</p>
                      <p className="text-white">
                        {selectedEvent.startTime.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="text-gray-300">
                        {selectedEvent.startTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })} - {selectedEvent.endTime.toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-400 mb-2">Attendees</p>
                      <div className="space-y-1">
                        {selectedEvent.attendees.map((attendee, idx) => (
                          <p key={idx} className="text-white text-sm">{attendee}</p>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* AI Brief */}
                  <div className="border-t border-white/[0.08] pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <span className="text-purple-400 text-xs">✨</span>
                      </div>
                      <p className="text-sm font-semibold text-purple-400">AI Meeting Brief</p>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {selectedEvent.brief}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-6 space-y-2">
                    <button className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all">
                      Join Meeting
                    </button>
                    <button className="w-full px-4 py-2 bg-white/[0.08] text-white rounded-lg hover:bg-white/[0.12] transition-all border border-white/[0.08]">
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
