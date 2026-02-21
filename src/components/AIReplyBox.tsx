'use client';

import { useState } from 'react';
import { Sparkles, Send, Check } from 'lucide-react';

interface AIReplyBoxProps {
  suggestedReply: string;
  onSend: (text: string) => void;
}

export default function AIReplyBox({ suggestedReply, onSend }: AIReplyBoxProps) {
  const [reply, setReply] = useState(suggestedReply);
  const [isEditing, setIsEditing] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    onSend(reply);
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-teal-500 flex items-center justify-center">
          <Sparkles size={10} className="text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700">AI Suggested Reply</span>
      </div>

      {isEditing ? (
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
          rows={3}
        />
      ) : (
        <p
          onClick={() => setIsEditing(true)}
          className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
        >
          {reply}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isEditing ? 'Preview' : 'Edit'}
        </button>
        <button
          onClick={handleSend}
          disabled={sent}
          className={`flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors ${
            sent
              ? 'bg-green-500 text-white'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {sent ? <><Check size={14} /> Sent!</> : <><Send size={14} /> Send</>}
        </button>
      </div>
    </div>
  );
}
