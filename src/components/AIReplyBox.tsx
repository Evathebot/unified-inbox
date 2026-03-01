'use client';

import { useState, useEffect } from 'react';
import { Send, Check, Pencil, Eye, RefreshCw, X } from 'lucide-react';

export type DraftTone = 'friendly' | 'formal' | 'brief' | 'detailed';

const TONES: { key: DraftTone; label: string; emoji: string }[] = [
  { key: 'friendly', label: 'Friendly', emoji: '😊' },
  { key: 'formal',   label: 'Formal',   emoji: '🎯' },
  { key: 'brief',    label: 'Brief',    emoji: '⚡' },
  { key: 'detailed', label: 'Detailed', emoji: '📝' },
];

interface AIReplyBoxProps {
  suggestedReply: string;
  onSend: (text: string) => void;
  onRegenerate?: (tone: DraftTone) => void;
  onDismiss?: () => void;
  /** Pass true while the AI draft is still being fetched from the server */
  loading?: boolean;
}

export default function AIReplyBox({
  suggestedReply,
  onSend,
  onRegenerate,
  onDismiss,
  loading = false,
}: AIReplyBoxProps) {
  const [reply, setReply] = useState(suggestedReply);
  const [isEditing, setIsEditing] = useState(false);
  const [sent, setSent] = useState(false);
  const [activeTone, setActiveTone] = useState<DraftTone>('friendly');

  // Keep reply in sync when the draft arrives from parent
  useEffect(() => {
    if (!loading && suggestedReply) {
      setReply(suggestedReply);
      setIsEditing(false);
      setSent(false);
    }
  }, [loading, suggestedReply]);

  const handleSend = () => {
    onSend(reply);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  const handleToneChange = (tone: DraftTone) => {
    if (tone === activeTone) return;
    setActiveTone(tone);
    onRegenerate?.(tone);
  };

  return (
    <div className="ai-border-gradient bg-white rounded-xl p-4 shadow-sm">
      {/* Header: AI orb + label + tone pills (all on one row) */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="ai-orb relative">
          <div className="ai-orb-glow"></div>
        </div>
        {loading ? (
          <div className="flex items-center gap-2">
            <span className="ai-text-gradient text-sm font-semibold">Auto drafting response</span>
            <span className="flex gap-0.5">
              <span className="typing-dot w-1 h-1 rounded-full bg-orange-400 inline-block"></span>
              <span className="typing-dot w-1 h-1 rounded-full bg-pink-400 inline-block"></span>
              <span className="typing-dot w-1 h-1 rounded-full bg-purple-400 inline-block"></span>
            </span>
          </div>
        ) : (
          <>
            <span className="ai-text-gradient text-sm font-semibold">AI Suggested Reply</span>
            {/* Tone pills — inline next to the label */}
            <div className="flex items-center gap-0.5 ml-1">
              {TONES.map(({ key, label, emoji }) => (
                <button
                  key={key}
                  onClick={() => handleToneChange(key)}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                    activeTone === key
                      ? 'bg-gradient-to-r from-purple-500 to-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={`Rewrite in ${label} tone`}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {/* Spacer + right-side controls */}
        <div className="flex items-center gap-2 ml-auto">
          {!loading && onRegenerate && (
            <button
              onClick={() => onRegenerate(activeTone)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              title="Regenerate draft"
            >
              <RefreshCw size={11} />
              <span>Regenerate</span>
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-500 transition-colors rounded"
              title="Dismiss AI draft"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Reply content */}
      {loading ? (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-full"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5"></div>
          </div>
        </div>
      ) : isEditing ? (
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300"
          rows={4}
          autoFocus
        />
      ) : (
        <p
          onClick={() => setIsEditing(true)}
          className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors leading-relaxed whitespace-pre-line"
          title="Click to edit"
        >
          {reply}
        </p>
      )}

      {/* Actions */}
      {!loading && (
        <div className="flex items-center justify-end gap-2 mt-3">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isEditing ? <><Eye size={13} /> Preview</> : <><Pencil size={13} /> Edit</>}
          </button>
          <button
            onClick={handleSend}
            disabled={sent}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-all ${
              sent
                ? 'bg-green-500 text-white'
                : 'ai-badge text-white hover:opacity-90'
            }`}
          >
            {sent ? <><Check size={14} /> Sent!</> : <><Send size={14} /> Send</>}
          </button>
        </div>
      )}
    </div>
  );
}
