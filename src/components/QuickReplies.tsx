'use client';

import { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';

interface QuickRepliesProps {
  messageId: string;
  onSelect: (text: string) => void;
  /** Conversation key — changing this resets quick replies */
  conversationKey: string;
}

export default function QuickReplies({ messageId, onSelect, conversationKey }: QuickRepliesProps) {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setReplies([]);
    setLoading(true);
    setDismissed(false);

    if (!messageId) {
      setLoading(false);
      return;
    }

    fetch('/api/ai/quick-replies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId }),
    })
      .then(r => r.json())
      .then(d => {
        if (Array.isArray(d.replies) && d.replies.length > 0) {
          setReplies(d.replies);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  if (dismissed || (!loading && replies.length === 0)) return null;

  return (
    <div className="px-4 py-2 bg-white border-t border-gray-100 flex items-center gap-2 flex-wrap shrink-0">
      {/* Icon */}
      <div className="flex items-center gap-1 shrink-0 mr-0.5">
        <Zap size={11} className="text-purple-400" />
        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide">Quick</span>
      </div>

      {loading ? (
        // Loading shimmer pills
        <>
          {[80, 110, 95].map((w, i) => (
            <div
              key={i}
              className="h-7 rounded-full bg-purple-50 animate-pulse"
              style={{ width: w }}
            />
          ))}
        </>
      ) : (
        <>
          {replies.map((reply, i) => (
            <button
              key={i}
              onClick={() => {
                onSelect(reply);
                setDismissed(true);
              }}
              className="px-3 py-1.5 rounded-full text-xs text-purple-700 bg-purple-50 border border-purple-100 hover:bg-purple-100 hover:border-purple-200 transition-colors font-medium whitespace-nowrap"
            >
              {reply}
            </button>
          ))}
          {/* Dismiss */}
          <button
            onClick={() => setDismissed(true)}
            className="ml-auto text-gray-300 hover:text-gray-500 text-[10px] shrink-0 transition-colors"
            title="Hide quick replies"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
