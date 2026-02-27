'use client';

import { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface ReplyToolbarProps {
  recipientName: string;
  channel: string;
  onMessageSent?: (text: string) => void;
}

type SendState = 'idle' | 'sending' | 'sent' | 'error' | 'not_connected';

export default function ReplyToolbar({ recipientName, channel, onMessageSent }: ReplyToolbarProps) {
  const [replyText, setReplyText] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || sendState === 'sending') return;

    setSendState('sending');
    setReplyText('');

    try {
      const res = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName: recipientName, channel, text }),
      });

      if (!res.ok) throw new Error('Send failed');

      const data = await res.json();

      if (data.demo) {
        // Beeper not connected yet — surface this clearly
        setSendState('not_connected');
        setReplyText(text); // restore so user doesn't lose it
        setTimeout(() => setSendState('idle'), 4000);
        return;
      }

      setSendState('sent');
      onMessageSent?.(text);
      setTimeout(() => setSendState('idle'), 2500);
    } catch {
      setSendState('error');
      setReplyText(text); // restore text so user doesn't lose it
      setTimeout(() => setSendState('idle'), 3000);
    }
  };

  if (sendState === 'sent') {
    return (
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 py-4 text-green-600 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Sent
        </div>
      </div>
    );
  }

  if (sendState === 'error') {
    return (
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 py-4 text-red-500 text-sm">
          Failed to send — check your Beeper connection
        </div>
      </div>
    );
  }

  if (sendState === 'not_connected') {
    return (
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 py-4 text-amber-600 text-sm font-medium">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Beeper not connected — configure it in Settings
        </div>
      </div>
    );
  }

  const isSending = sendState === 'sending';

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      <div className="flex items-end gap-2">
        <textarea
          data-reply-textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder={`Reply to ${recipientName}...`}
          rows={1}
          disabled={isSending}
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white placeholder-gray-400 min-h-[40px] max-h-[120px] disabled:opacity-60"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = Math.min(t.scrollHeight, 120) + 'px';
          }}
        />
        <button
          onClick={handleSend}
          disabled={!replyText.trim() || isSending}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
            replyText.trim() && !isSending
              ? 'ai-badge text-white hover:opacity-90'
              : 'bg-gray-100 text-gray-400'
          }`}
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
}
