'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface TopMessage {
  sender: string;
  preview: string;
  channel: string;
}

interface BriefingAISummaryProps {
  priorityCount: number;
  overdueCount: number;
  calendarCount: number;
  topSenders: string[];
  topMessages?: TopMessage[];
}

export default function BriefingAISummary({
  priorityCount,
  overdueCount,
  calendarCount,
  topSenders,
  topMessages = [],
}: BriefingAISummaryProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const generate = async () => {
    setLoading(true);
    setSummary(null);
    try {
      const res = await fetch('/api/ai/briefing-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priorityCount, overdueCount, calendarCount, topSenders, topMessages }),
      });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate on mount — no button click required
  useEffect(() => {
    generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border border-purple-100 rounded-2xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="ai-orb relative shrink-0" style={{ width: 16, height: 16 }}>
            <div className="ai-orb-glow" />
          </div>
          <span className="text-xs font-semibold ai-text-gradient">Preparing your daily briefing…</span>
        </div>
        <div className="space-y-1.5 py-1">
          <div className="h-2.5 bg-purple-100 rounded animate-pulse w-full" />
          <div className="h-2.5 bg-purple-100 rounded animate-pulse w-4/5" />
          <div className="h-2.5 bg-purple-100 rounded animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  if (!summary) {
    // Fallback static summary if AI failed
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border border-purple-100 rounded-2xl flex items-center gap-3">
        <div className="ai-orb relative shrink-0" style={{ width: 20, height: 20 }}>
          <div className="ai-orb-glow" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-gray-600">
            <span className="font-semibold ai-text-gradient">AI Daily Briefing · </span>
            {priorityCount > 0
              ? `${priorityCount} priority message${priorityCount !== 1 ? 's' : ''} need attention`
              : 'Your inbox is looking good today'
            }
            {overdueCount > 0 ? ` · ${overdueCount} overdue` : ''}
            {calendarCount > 0 ? ` · ${calendarCount} event${calendarCount !== 1 ? 's' : ''} today` : ''}
            .
          </p>
        </div>
        <button
          onClick={generate}
          title="Retry"
          className="shrink-0 text-purple-400 hover:text-purple-600 transition-colors"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border border-purple-100 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className="ai-orb relative shrink-0 mt-0.5" style={{ width: 16, height: 16 }}>
          <div className="ai-orb-glow" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold ai-text-gradient mb-1.5">AI Daily Briefing</p>
          <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
        </div>
        <button
          onClick={generate}
          className="shrink-0 text-purple-400 hover:text-purple-600 transition-colors mt-0.5"
          title="Refresh briefing"
        >
          <RefreshCw size={13} />
        </button>
      </div>
    </div>
  );
}
