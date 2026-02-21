'use client';

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';
import GlassCard from './GlassCard';

interface AIReplyBoxProps {
  suggestedReply: string;
  onSend?: (text: string) => void;
}

export default function AIReplyBox({ suggestedReply, onSend }: AIReplyBoxProps) {
  const [text, setText] = useState(suggestedReply);

  const handleSend = () => {
    if (text.trim()) {
      onSend?.(text);
    }
  };

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-purple-400" />
        <span className="text-sm text-purple-400 font-medium">AI Suggested Reply</span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="
          w-full p-3 mb-3
          bg-white/[0.06] border border-white/[0.08]
          rounded-xl resize-none
          text-white placeholder:text-gray-500
          focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.08]
          transition-all duration-200
        "
        rows={4}
        placeholder="Type your reply..."
      />

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setText(suggestedReply)}
          className="
            px-4 py-2 rounded-lg
            text-sm text-gray-300
            hover:bg-white/[0.06]
            transition-all duration-200
          "
        >
          Reset to AI
        </button>
        <button
          onClick={handleSend}
          className="
            px-6 py-2 rounded-lg
            bg-gradient-to-r from-purple-500 to-pink-500
            text-white font-medium text-sm
            hover:from-purple-600 hover:to-pink-600
            transition-all duration-200
            flex items-center gap-2
          "
        >
          <Send size={16} />
          Send Reply
        </button>
      </div>
    </GlassCard>
  );
}
