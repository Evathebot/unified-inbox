'use client';

import { useState } from 'react';
import { Send, X, Type, Paperclip, Link2, Image, Smile, Mic } from 'lucide-react';

interface ReplyToolbarProps {
  recipientName: string;
}

export default function ReplyToolbar({ recipientName }: ReplyToolbarProps) {
  const [replyText, setReplyText] = useState('');
  const [replySent, setReplySent] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const handleSend = () => {
    if (replyText.trim()) {
      setReplySent(true);
      setReplyText('');
      setTimeout(() => setReplySent(false), 2500);
    }
  };

  if (replySent) {
    return (
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 py-4 text-green-600 text-sm font-medium">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
          Message sent!
        </div>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <button onClick={() => { setIsRecording(false); setRecordingTime(0); }}
            className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
            <X size={16} />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 voice-recording"></div>
            <span className="text-sm font-medium text-red-500">Recording...</span>
            <span className="text-xs text-gray-400 font-mono">{Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}</span>
            <div className="flex items-center gap-0.5 h-6">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="w-0.5 bg-red-400 rounded-full"
                  style={{ height: `${Math.random() * 20 + 4}px`, opacity: 0.4 + Math.random() * 0.6, animation: `voice-pulse ${1 + Math.random()}s ease-in-out infinite`, animationDelay: `${i * 0.05}s` }} />
              ))}
            </div>
          </div>
          <button onClick={() => { setIsRecording(false); setRecordingTime(0); setReplySent(true); setTimeout(() => setReplySent(false), 2500); }}
            className="w-10 h-10 rounded-xl ai-badge text-white flex items-center justify-center hover:opacity-90 transition-all">
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 ml-14">Voice will be transcribed with Whisper AI</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2 px-1">
        {[{ icon: Type, title: 'Format text' }, { icon: Paperclip, title: 'Attach file' }, { icon: Link2, title: 'Add link' }, { icon: Smile, title: 'Emoji' }, { icon: Image, title: 'Add image' }].map(({ icon: Icon, title }) => (
          <button key={title} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all" title={title}>
            <Icon size={14} />
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => { setIsRecording(true); const interval = setInterval(() => setRecordingTime(t => { if (t >= 120) { clearInterval(interval); return t; } return t + 1; }), 1000); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all" title="Record voice message">
          <Mic size={14} />
        </button>
      </div>

      {/* Input + Send */}
      <div className="flex items-end gap-2">
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder={`Reply to ${recipientName}...`}
          rows={1}
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 focus:bg-white placeholder-gray-400 min-h-[40px] max-h-[120px]"
          style={{ height: 'auto', overflow: 'hidden' }}
          onInput={(e) => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 120) + 'px'; }}
        />
        <button onClick={handleSend} disabled={!replyText.trim()}
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${replyText.trim() ? 'ai-badge text-white hover:opacity-90' : 'bg-gray-100 text-gray-400'}`}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
