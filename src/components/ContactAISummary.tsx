'use client';

import { useState, useEffect } from 'react';

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
}

export default function ContactAISummary({ contactId, existingPersonality }: ContactAISummaryProps) {
  const [analysis, setAnalysis] = useState<ContactAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // If we already have real personality data (not defaults), show it
  const hasExistingData = existingPersonality?.responsePatterns &&
    existingPersonality.responsePatterns !== 'No history' &&
    existingPersonality.responsePatterns !== 'Consistent';

  useEffect(() => {
    if (hasExistingData && existingPersonality) {
      setAnalysis({
        communicationStyle: existingPersonality.communicationStyle || '',
        preferredLanguage: '',
        responsePatterns: existingPersonality.responsePatterns || '',
        keyTopics: existingPersonality.keyTopics || [],
        relationshipStrength: 0,
      });
      setGenerated(true);
    }
  }, [hasExistingData]);

  const generateSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/analyze-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId }),
      });
      const data = await res.json();
      if (data.analysis) {
        setAnalysis(data.analysis);
        setGenerated(true);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  if (!generated && !loading) {
    return (
      <div className="shrink-0">
        <button
          onClick={generateSummary}
          className="text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500 to-orange-500 text-white font-medium hover:opacity-90 transition-opacity"
        >
          ✦ Generate AI Summary
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="shrink-0 w-44 space-y-1.5">
        <div className="h-2.5 bg-purple-100 rounded animate-pulse w-full" />
        <div className="h-2.5 bg-purple-100 rounded animate-pulse w-4/5" />
        <div className="h-2.5 bg-purple-100 rounded animate-pulse w-3/5" />
        <p className="text-[10px] text-purple-400 mt-1">Analysing messages…</p>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="shrink-0 max-w-[200px] text-right">
      <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider mb-1.5">AI Profile</p>
      {analysis.communicationStyle && (
        <p className="text-xs text-gray-600 leading-relaxed mb-2">{analysis.communicationStyle}</p>
      )}
      {analysis.responsePatterns && (
        <p className="text-[11px] text-gray-500 leading-relaxed mb-2">{analysis.responsePatterns}</p>
      )}
      {analysis.keyTopics.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-end">
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
        className="mt-2 text-[10px] text-purple-400 hover:text-purple-600 transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}
