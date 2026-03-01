'use client';

import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface ContactAnalysis {
  communicationStyle: string;
  preferredLanguage: string;
  responsePatterns: string;
  keyTopics: string[];
  relationshipStrength: number;
}

interface ContactAISummaryProps {
  contactId: string;
  existingPersonality?: {
    communicationStyle?: string;
    responsePatterns?: string;
    keyTopics?: string[];
  } | null;
  /** Number of messages available — used to decide whether to auto-analyze */
  messageCount?: number;
}

export default function ContactAISummary({
  contactId,
  existingPersonality,
  messageCount = 0,
}: ContactAISummaryProps) {
  const [analysis, setAnalysis] = useState<ContactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  // Check if we already have real personality data (not placeholder defaults)
  const hasExistingData =
    existingPersonality?.responsePatterns &&
    existingPersonality.responsePatterns !== 'No history' &&
    existingPersonality.responsePatterns !== 'Consistent';

  // Seed state from existing personality data
  useEffect(() => {
    if (hasExistingData && existingPersonality) {
      setAnalysis({
        communicationStyle: existingPersonality.communicationStyle || '',
        preferredLanguage: '',
        responsePatterns: existingPersonality.responsePatterns || '',
        keyTopics: existingPersonality.keyTopics || [],
        relationshipStrength: 0,
      });
    }
  }, [hasExistingData, existingPersonality]);

  // Auto-generate when there are messages but no cached analysis
  useEffect(() => {
    if (!hasExistingData && messageCount > 0) {
      generateSummary();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateSummary = async () => {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch('/api/ai/analyze-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="shrink-0 w-48">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="ai-orb relative shrink-0" style={{ width: 12, height: 12 }}>
            <div className="ai-orb-glow" />
          </div>
          <p className="text-[10px] font-semibold ai-text-gradient uppercase tracking-wider">Analysing messages…</p>
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 bg-purple-100 rounded animate-pulse w-full" />
          <div className="h-2.5 bg-purple-100 rounded animate-pulse w-4/5" />
          <div className="h-2.5 bg-purple-100 rounded animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  // No data and no messages — show nothing or a minimal placeholder
  if (!analysis) {
    if (messageCount === 0) {
      return (
        <div className="shrink-0">
          <p className="text-[10px] text-gray-300 text-right">No messages to analyse yet</p>
        </div>
      );
    }

    // Failed to load — show retry button
    if (failed) {
      return (
        <div className="shrink-0">
          <button
            onClick={generateSummary}
            className="text-xs px-3 py-1.5 rounded-lg border border-purple-200 text-purple-600 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw size={11} /> Retry AI analysis
          </button>
        </div>
      );
    }

    return null;
  }

  return (
    <div className="shrink-0 max-w-[200px] text-right">
      <div className="flex items-center justify-end gap-1.5 mb-1.5">
        <div className="ai-orb relative shrink-0" style={{ width: 10, height: 10 }}>
          <div className="ai-orb-glow" />
        </div>
        <p className="text-[10px] font-semibold ai-text-gradient uppercase tracking-wider">AI Profile</p>
      </div>
      {analysis.communicationStyle && (
        <p className="text-xs text-gray-600 leading-relaxed mb-2">{analysis.communicationStyle}</p>
      )}
      {analysis.responsePatterns && (
        <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{analysis.responsePatterns}</p>
      )}
      {analysis.keyTopics.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end mb-2">
          {analysis.keyTopics.slice(0, 4).map((topic) => (
            <span
              key={topic}
              className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full"
            >
              {topic}
            </span>
          ))}
        </div>
      )}
      <button
        onClick={generateSummary}
        className="text-[10px] text-purple-400 hover:text-purple-600 transition-colors flex items-center gap-1 ml-auto"
        title="Refresh AI analysis"
      >
        <RefreshCw size={9} /> Refresh
      </button>
    </div>
  );
}
