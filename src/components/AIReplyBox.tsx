'use client';

import { useState } from 'react';
import { Sparkles, Send } from 'lucide-react';

interface AIReplyBoxProps {
  suggestedReply: string;
  onSend: (text: string) => void;
}

export default function AIReplyBox({ suggestedReply, onSend }: AIReplyBoxProps) {
  const [reply, setReply] = useState(suggestedReply);
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={16} className="text-orange-500" />
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
          onClick={() => onSend(reply)}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </div>
  );
}
