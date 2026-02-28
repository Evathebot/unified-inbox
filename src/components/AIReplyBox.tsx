'use client';

import { useState, useEffect } from 'react';
import { Send, Check, Pencil, Eye, RefreshCw, X } from 'lucide-react';

interface AIReplyBoxProps {
  suggestedReply: string;
  onSend: (text: string) => void;
  onRegenerate?: () => void;
  onDismiss?: () => void;
  /** Pass true while the AI draft is still being fetched from the server */
  loading?: boolean;
}

export default function AIReplyBox({ suggestedReply, onSend, onRegenerate, onDismiss, loading = false }: AIReplyBoxProps) {
  const [reply, setReply] = useState(suggestedReply);
  const [isEditing, setIsEditing] = useState(false);
  const [sent, setSent] = useState(false);

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

  return (
    <div className="ai-border-gradient bg-white rounded-xl p-4 shadow-sm">
      {/* Header with AI orb */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
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
            <span className="ai-text-gradient text-sm font-semibold">AI Suggested Reply</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!loading && onRegenerate && (
            <button
              onClick={onRegenerate}
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
        />
      ) : (
        <p
          onClick={() => setIsEditing(true)}
          className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors leading-relaxed whitespace-pre-line"
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
