'use client';

import { X, Send } from 'lucide-react';
import ChannelBadge from '@/components/ChannelBadge';
import { Channel } from '@/lib/mockData';

interface ComposePanelProps {
  composeTo: string;
  setComposeTo: (v: string) => void;
  composeChannel: Channel;
  setComposeChannel: (v: Channel) => void;
  composeSubject: string;
  setComposeSubject: (v: string) => void;
  composeBody: string;
  setComposeBody: (v: string) => void;
  onDiscard: () => void;
  onSend: () => void;
}

export default function ComposePanel({
  composeTo, setComposeTo,
  composeChannel, setComposeChannel,
  composeSubject, setComposeSubject,
  composeBody, setComposeBody,
  onDiscard, onSend,
}: ComposePanelProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
          <button onClick={onDiscard} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 shrink-0">To</label>
            <input type="text" value={composeTo} onChange={(e) => setComposeTo(e.target.value)}
              placeholder="Recipient name or email..."
              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500 w-16 shrink-0">Channel</label>
            <div className="flex gap-2">
              {(['gmail', 'whatsapp', 'telegram', 'slack'] as Channel[]).map(ch => (
                <button key={ch} onClick={() => setComposeChannel(ch)}
                  className={`p-2 rounded-lg border transition-all ${composeChannel === ch ? 'border-gray-900 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <ChannelBadge channel={ch} size="md" />
                </button>
              ))}
            </div>
          </div>
          {composeChannel === 'gmail' && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-500 w-16 shrink-0">Subject</label>
              <input type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)}
                placeholder="Subject..."
                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-300" />
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 p-6">
        <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)}
          placeholder="Write your message..."
          className="w-full h-full p-4 bg-white border border-gray-200 rounded-xl text-sm text-gray-800 resize-none focus:outline-none focus:ring-1 focus:ring-gray-300 placeholder-gray-400" />
      </div>
      <div className="p-6 bg-white border-t border-gray-200 flex items-center justify-between">
        <button onClick={onDiscard} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">Discard</button>
        <button onClick={onSend} className="flex items-center gap-2 px-5 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors">
          <Send size={14} /> Send
        </button>
      </div>
    </div>
  );
}
