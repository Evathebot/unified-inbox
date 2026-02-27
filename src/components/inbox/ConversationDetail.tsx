'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '@/components/Avatar';
import ChannelBadge from '@/components/ChannelBadge';
import ChannelContextBadge from '@/components/ChannelContextBadge';
import AIReplyBox from '@/components/AIReplyBox';
import { getRelativeTime, Message } from '@/lib/mockData';
import { ConversationGroup } from './types';
import ReplyToolbar from './ReplyToolbar';

interface ConversationDetailProps {
  group: ConversationGroup;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDay(messages: Message[]): Array<{ date: Date; messages: Message[] }> {
  const result: Array<{ date: Date; messages: Message[] }> = [];
  for (const msg of messages) {
    const msgDay = new Date(msg.timestamp.getFullYear(), msg.timestamp.getMonth(), msg.timestamp.getDate());
    const last = result[result.length - 1];
    if (last && last.date.getTime() === msgDay.getTime()) {
      last.messages.push(msg);
    } else {
      result.push({ date: msgDay, messages: [msg] });
    }
  }
  return result;
}

export default function ConversationDetail({ group }: ConversationDetailProps) {
  // ── Local (optimistically sent) messages ─────────────────
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // ── AI Summary ───────────────────────────────────────────
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryDismissed, setSummaryDismissed] = useState(false);

  // ── AI Draft ─────────────────────────────────────────────
  const [aiDraft, setAiDraft] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState(true);

  // Ref to scroll the thread to the bottom after new messages
  const threadBottomRef = useRef<HTMLDivElement>(null);

  // Use a ref-based key so we can cancel stale fetches when the conversation changes
  const conversationKey = `${group.senderName}|${group.channel}`;
  const currentKeyRef = useRef(conversationKey);

  useEffect(() => {
    currentKeyRef.current = conversationKey;

    // Reset all state for the new conversation
    setLocalMessages([]);
    setAiSummary(null);
    setSummaryLoading(true);
    setSummaryDismissed(false);
    setAiDraft('');
    setDraftLoading(true);

    const key = conversationKey;

    // ── Fetch AI summary ────────────────────────────────────
    const messages = group.messages.map(m => ({
      sender: m.sender.name,
      body: m.preview,
    }));

    fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, contactName: group.senderName }),
    })
      .then(r => r.json())
      .then(d => {
        if (currentKeyRef.current !== key) return; // stale
        setAiSummary(d.summary || null);
        setSummaryLoading(false);
      })
      .catch(() => {
        if (currentKeyRef.current !== key) return;
        setSummaryLoading(false);
      });

    // ── Fetch AI draft ──────────────────────────────────────
    const latestMsg = group.messages[group.messages.length - 1];
    if (latestMsg?.id) {
      fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: latestMsg.id }),
      })
        .then(r => r.json())
        .then(d => {
          if (currentKeyRef.current !== key) return;
          setAiDraft(d.draft || '');
          setDraftLoading(false);
        })
        .catch(() => {
          if (currentKeyRef.current !== key) return;
          setAiDraft('Thank you for your message. I\'ll get back to you shortly.');
          setDraftLoading(false);
        });
    } else {
      setDraftLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  // Scroll to bottom whenever local messages (sent by user) are added
  useEffect(() => {
    if (localMessages.length > 0) {
      threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  const handleRegenerateDraft = () => {
    setAiDraft('');
    setDraftLoading(true);
    const latestMsg = group.messages[group.messages.length - 1];
    if (!latestMsg?.id) return;
    fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: latestMsg.id }),
    })
      .then(r => r.json())
      .then(d => { setAiDraft(d.draft || ''); setDraftLoading(false); })
      .catch(() => { setAiDraft('Thank you for your message. I\'ll get back to you shortly.'); setDraftLoading(false); });
  };

  // Add a sent message to the local (optimistic) list
  const addLocalMessage = useCallback((text: string) => {
    const msg: Message = {
      id: `local-${Date.now()}`,
      channel: group.channel,
      sender: { name: 'Me', avatar: '', online: true },
      preview: text,
      timestamp: new Date(),
      priority: 0,
      unread: false,
      answered: true,
      account: 'personal',
      hasAIDraft: false,
    };
    setLocalMessages(prev => [...prev, msg]);
  }, [group.channel]);

  const handleSendDraft = (text: string) => {
    fetch('/api/conversations/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderName: group.senderName, channel: group.channel, text }),
    })
      .then(r => r.json())
      .then(d => {
        if (!d.demo) addLocalMessage(text);
        // If d.demo, Beeper isn't connected — ReplyToolbar surfaces this;
        // AIReplyBox already shows "Sent!" optimistically which is acceptable UX.
      })
      .catch(() => {});
  };

  const allMessages = [...group.messages, ...localMessages];
  const dayGroups = groupByDay(allMessages);

  return (
    <>
      {/* Slim header */}
      <div className="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
        <Avatar src={group.senderAvatar} name={group.senderName} size="md" online={group.senderOnline} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-gray-900 truncate">{group.senderName}</h2>
            <ChannelBadge channel={group.channel} size="sm" />
          </div>
          {group.channelContext && !group.channelContext.isDM ? (
            <ChannelContextBadge channel={group.channel} context={group.channelContext} compact />
          ) : (
            <p className="text-xs text-gray-400">{getRelativeTime(group.latestTimestamp)}</p>
          )}
        </div>
        {group.topicLabel && (
          <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
            {group.topicLabel}
          </span>
        )}
      </div>

      {/* ── AI Summary Banner ─────────────────────────────── */}
      {!summaryDismissed && (summaryLoading || aiSummary) && (
        <div className="px-4 py-2.5 bg-gradient-to-r from-purple-50 via-pink-50 to-orange-50 border-b border-purple-100 flex items-start gap-2.5 shrink-0">
          <div className="ai-orb relative shrink-0 mt-0.5" style={{ width: 14, height: 14 }}>
            <div className="ai-orb-glow"></div>
          </div>
          {summaryLoading ? (
            <div className="flex-1 space-y-1.5 py-0.5">
              <div className="h-2.5 bg-purple-100 rounded animate-pulse w-full" />
              <div className="h-2.5 bg-purple-100 rounded animate-pulse w-3/4" />
            </div>
          ) : (
            <p className="flex-1 text-xs text-gray-600 leading-relaxed">
              <span className="font-semibold ai-text-gradient">AI Summary · </span>
              {aiSummary}
            </p>
          )}
          {!summaryLoading && (
            <button
              onClick={() => setSummaryDismissed(true)}
              className="shrink-0 text-gray-300 hover:text-gray-500 text-xs leading-none mt-0.5 transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* Chat thread */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 bg-gray-50">
        {dayGroups.map(({ date, messages: dayMsgs }) => (
          <div key={date.toISOString()}>
            {/* Date separator */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-400 font-medium shrink-0">{formatDateSeparator(date)}</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Messages for this day */}
            <div className="space-y-1">
              {dayMsgs.map((msg, idx) => {
                const isMe = msg.sender.name === 'Me';
                const isFirst = idx === 0 || dayMsgs[idx - 1].sender.name !== msg.sender.name;
                const isLast = idx === dayMsgs.length - 1 || dayMsgs[idx + 1].sender.name !== msg.sender.name;

                if (isMe) {
                  // ── Outgoing (right-aligned) ───────────────
                  return (
                    <div key={msg.id || idx} className={`flex items-end justify-end gap-2 ${isFirst ? 'mt-2' : 'mt-0.5'}`}>
                      <div className="max-w-[72%] flex flex-col items-end">
                        {isFirst && (
                          <p className="text-[11px] text-gray-400 font-medium mb-1 mr-1">You</p>
                        )}
                        <div className={`
                          px-3.5 py-2.5 text-sm text-white leading-relaxed shadow-sm ai-badge
                          ${isFirst && isLast ? 'rounded-2xl rounded-br-sm' : ''}
                          ${isFirst && !isLast ? 'rounded-2xl rounded-br-sm rounded-b-lg' : ''}
                          ${!isFirst && !isLast ? 'rounded-lg rounded-r-sm' : ''}
                          ${!isFirst && isLast ? 'rounded-2xl rounded-tr-sm rounded-t-lg rounded-br-sm' : ''}
                        `}>
                          {msg.preview}
                        </div>
                        {isLast && (
                          <p className="text-[10px] text-gray-400 mt-1 mr-1">{formatTime(msg.timestamp)}</p>
                        )}
                      </div>
                    </div>
                  );
                }

                // ── Incoming (left-aligned) ────────────────
                return (
                  <div key={msg.id || idx} className={`flex items-end gap-2 ${isFirst ? 'mt-2' : 'mt-0.5'}`}>
                    <div className="w-8 shrink-0 flex items-end">
                      {isLast ? (
                        <Avatar src={msg.sender.avatar} name={msg.sender.name} size="sm" />
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>

                    <div className="max-w-[72%] flex flex-col">
                      {isFirst && (
                        <p className="text-[11px] text-gray-400 font-medium mb-1 ml-1">{msg.sender.name}</p>
                      )}
                      {msg.subject && isFirst && (
                        <p className="text-[11px] text-gray-500 font-medium mb-1 ml-1 italic">{msg.subject}</p>
                      )}
                      <div className={`
                        px-3.5 py-2.5 text-sm text-gray-800 leading-relaxed shadow-sm
                        ${isFirst && isLast ? 'rounded-2xl rounded-bl-sm' : ''}
                        ${isFirst && !isLast ? 'rounded-2xl rounded-bl-sm rounded-b-lg' : ''}
                        ${!isFirst && !isLast ? 'rounded-lg rounded-l-sm' : ''}
                        ${!isFirst && isLast ? 'rounded-2xl rounded-tl-sm rounded-t-lg rounded-bl-sm' : ''}
                        bg-white border border-gray-100
                      `}>
                        {msg.preview}
                      </div>
                      {isLast && (
                        <p className="text-[10px] text-gray-400 mt-1 ml-1">{formatTime(msg.timestamp)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* Scroll anchor */}
        <div ref={threadBottomRef} />
      </div>

      {/* ── AI Reply Box (always shown) ───────────────────── */}
      <div className="px-4 pt-3 pb-1 bg-white border-t border-gray-100">
        <AIReplyBox
          suggestedReply={aiDraft}
          loading={draftLoading}
          onSend={handleSendDraft}
          onRegenerate={handleRegenerateDraft}
        />
      </div>

      {/* Manual reply input */}
      <ReplyToolbar
        recipientName={group.senderName}
        channel={group.channel}
        onMessageSent={addLocalMessage}
      />
    </>
  );
}
