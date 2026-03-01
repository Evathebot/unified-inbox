'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, Video, MoreHorizontal, SmilePlus, Forward, Copy, Check, X } from 'lucide-react';
import Avatar from '@/components/Avatar';
import ChannelBadge from '@/components/ChannelBadge';
import ChannelContextBadge from '@/components/ChannelContextBadge';
import AIReplyBox, { type DraftTone } from '@/components/AIReplyBox';
import { getRelativeTime, Message } from '@/lib/mockData';
import { ConversationGroup } from './types';
import ReplyToolbar from './ReplyToolbar';

/**
 * Detail panel for the selected conversation group (right two-thirds of the inbox).
 *
 * Renders messages in the native style of the source channel:
 * - **Slack** — white background, avatar + sender name on the first message of
 *   each consecutive run, timestamp per message, "N replies" thread links that
 *   open a right-side ThreadPanel.
 * - **WhatsApp / Telegram** — iMessage-style colour bubbles (outgoing right,
 *   incoming left).
 * - **Gmail** — full-width email card layout with subject line.
 *
 * Additional features:
 * - AI Summary banner (dismissable, cached per conversation so it doesn't re-fire)
 * - AI-generated draft reply (editable before sending)
 * - Quick emoji reactions (hover to reveal)
 * - Message copy / forward actions
 * - Reply toolbar with emoji picker, file attach, and voice record buttons
 * - Slack ThreadPanel that slides in from the right when a thread is opened
 */
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

/** Convert mxc:// or localmxc:// → proxied Matrix media URL (auth added server-side) */
function convertMxcUrl(mxc: string): string {
  const scheme = mxc.startsWith('localmxc://') ? 'localmxc://' : 'mxc://';
  const withoutScheme = mxc.slice(scheme.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx === -1) return '';
  const server = withoutScheme.slice(0, slashIdx);
  const mediaId = withoutScheme.slice(slashIdx + 1);
  // Local Beeper bridge media (localmxc://local-*) is not publicly accessible
  if (server.startsWith('local-')) return '';
  const matrixUrl = `https://matrix.beeper.com/_matrix/media/v3/download/${server}/${mediaId}`;
  return `/api/media/proxy?url=${encodeURIComponent(matrixUrl)}`;
}

function isImageUrl(text: string, messageType?: string): boolean {
  const trimmed = text.trim();
  // Explicit type from DB
  if (messageType === 'image') return true;
  if (messageType && messageType !== 'text' && messageType !== 'image') return false;
  if (trimmed.startsWith('mxc://') || trimmed.startsWith('localmxc://')) {
    // Only treat as image if it's not a local bridge URL (those can't load)
    const withoutScheme = trimmed.startsWith('localmxc://') ? trimmed.slice('localmxc://'.length) : trimmed.slice('mxc://'.length);
    const server = withoutScheme.split('/')[0];
    if (server.startsWith('local-')) return false;
    return true;
  }
  // Local media proxy — check extension if present
  if (trimmed.startsWith('/api/media/local')) {
    return /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(trimmed);
  }
  return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(trimmed);
}

function isVoiceUrl(text: string, messageType?: string): boolean {
  if (messageType === 'voice' || messageType === 'audio') return true;
  const trimmed = text.trim();
  if (trimmed.startsWith('/api/media/local')) {
    return /\.(ogg|oga|opus|m4a|mp3|wav|aac|caf)(\?|$)/i.test(trimmed);
  }
  return false;
}

function resolveImageSrc(text: string): string {
  const trimmed = text.trim();
  // Already a local proxy URL — pass through
  if (trimmed.startsWith('/api/media/local')) return trimmed;
  if (trimmed.startsWith('mxc://') || trimmed.startsWith('localmxc://')) return convertMxcUrl(trimmed);
  return trimmed;
}

const QUICK_REACTIONS = ['❤️', '😂', '😮', '😢', '😡', '👍'];

interface MessageReactions {
  [msgId: string]: { [emoji: string]: number };
}

interface HoverActionsProps {
  isMe: boolean;
  msgId: string;
  text: string;
  reactions: { [emoji: string]: number };
  onReact: (emoji: string) => void;
  onForward: () => void;
  onCopy: () => void;
  slackLayout?: boolean;
}

function HoverActions({ isMe, text, reactions, onReact, onForward, onCopy, slackLayout }: HoverActionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    onCopy();
    setTimeout(() => setCopied(false), 1500);
  };

  const positionClass = slackLayout
    ? 'absolute right-4 -top-4 flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg shadow-md px-0.5 py-0.5'
    : `absolute ${isMe ? 'right-full mr-2' : 'left-full ml-2'} top-0 flex items-center gap-1`;

  const btnClass = slackLayout
    ? 'w-7 h-7 rounded flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors'
    : 'w-7 h-7 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors';

  return (
    <div className={`${positionClass} opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150 z-20`}>
      {/* Quick reaction picker */}
      <div className="relative">
        <button onClick={() => setShowPicker(p => !p)} className={btnClass} title="React">
          <SmilePlus size={14} />
        </button>
        {showPicker && (
          <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-2xl shadow-lg p-1.5 flex gap-1 z-30">
            {QUICK_REACTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => { onReact(emoji); setShowPicker(false); }}
                className="w-8 h-8 rounded-xl hover:bg-gray-100 flex items-center justify-center text-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Forward */}
      <button onClick={onForward} className={btnClass} title="Forward">
        <Forward size={13} />
      </button>

      {/* Copy */}
      <button onClick={handleCopy} className={btnClass} title="Copy">
        {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

// ── Slack Thread Panel ───────────────────────────────────────────────────────

interface ThreadPanelProps {
  parentMsg: Message;
  onClose: () => void;
}

function ThreadPanel({ parentMsg, onClose }: ThreadPanelProps) {
  const [replyText, setReplyText] = useState('');
  const replies = parentMsg.thread?.messages ?? [];

  return (
    <div className="w-[340px] shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Thread</h3>
          {parentMsg.channelContext?.channelName && (
            <p className="text-xs text-gray-400">{parentMsg.channelContext.channelName}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={15} />
        </button>
      </div>

      {/* Parent message */}
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <div className="flex items-start gap-3">
          <Avatar src={parentMsg.sender.avatar} name={parentMsg.sender.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <span className="text-sm font-semibold text-gray-900">{parentMsg.sender.name}</span>
              <span className="text-[11px] text-gray-400">{formatTime(parentMsg.timestamp)}</span>
            </div>
            <p className="text-sm text-gray-800 leading-relaxed break-words">
              {parentMsg.body ?? parentMsg.preview}
            </p>
          </div>
        </div>
      </div>

      {/* Replies list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {replies.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500">
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
        )}

        {replies.map((reply, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-[11px] font-semibold text-gray-600 shrink-0">
              {reply.from.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-sm font-semibold text-gray-900">{reply.from}</span>
                <span className="text-[11px] text-gray-400">{formatTime(reply.timestamp)}</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed break-words">{reply.content}</p>
            </div>
          </div>
        ))}

        {replies.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No replies yet. Start the thread!</p>
        )}
      </div>

      {/* Reply input */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                setReplyText('');
              }
            }}
            placeholder="Reply in thread..."
            rows={2}
            className="flex-1 resize-none px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white placeholder-gray-400"
          />
          <button
            disabled={!replyText.trim()}
            className="px-3 py-2 text-sm bg-[#1264a3] text-white rounded-xl hover:bg-[#0b4f8a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function ConversationDetail({ group }: ConversationDetailProps) {
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [aiDraft, setAiDraft] = useState<string>('');
  const [draftLoading, setDraftLoading] = useState(true);
  const [aiDraftDismissed, setAiDraftDismissed] = useState(false);
  const [reactions, setReactions] = useState<MessageReactions>({});
  const [forwardToast, setForwardToast] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<Message | null>(null);

  const threadBottomRef = useRef<HTMLDivElement>(null);
  // Use conversationId as the stable key when available, otherwise fall back to sender+channel
  const conversationKey = group.conversationId ?? `${group.senderName}|${group.channel}`;
  const currentKeyRef = useRef(conversationKey);
  // Cache draft reply so switching back to a conversation doesn't re-fire the API call
  const aiCacheRef = useRef<Map<string, { draft: string }>>(new Map());

  useEffect(() => {
    currentKeyRef.current = conversationKey;
    setLocalMessages([]);
    setAiDraftDismissed(false);
    setReactions({});
    setSelectedThread(null);

    // Snap to the bottom of the conversation immediately (instant, not animated)
    requestAnimationFrame(() => {
      threadBottomRef.current?.scrollIntoView({ behavior: 'instant' });
    });

    const key = conversationKey;
    const latestMsg = group.messages[group.messages.length - 1];
    // Use latestMsgId as cache key — if no new message has arrived, reuse existing draft
    const draftStorageKey = latestMsg?.id ? `ai-draft:${latestMsg.id}` : null;

    // 1. Check in-session memory cache
    const cached = aiCacheRef.current.get(key);
    if (cached) {
      setAiDraft(cached.draft);
      setDraftLoading(false);
      return;
    }

    // 2. Check localStorage (persists across page refreshes)
    if (draftStorageKey) {
      try {
        const stored = localStorage.getItem(draftStorageKey);
        if (stored) {
          setAiDraft(stored);
          setDraftLoading(false);
          aiCacheRef.current.set(key, { draft: stored });
          return;
        }
      } catch { /* ignore storage errors */ }
    }

    // 3. Fresh conversation — fetch draft from AI
    setAiDraft('');
    setDraftLoading(true);

    if (latestMsg?.id) {
      fetch('/api/ai/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: latestMsg.id }),
      })
        .then(r => r.json())
        .then(d => {
          if (currentKeyRef.current !== key) return;
          const draft = d.draft || '';
          setAiDraft(draft);
          setDraftLoading(false);
          aiCacheRef.current.set(key, { draft });
          // Persist to localStorage so future page loads skip the fetch
          if (draftStorageKey && draft) {
            try { localStorage.setItem(draftStorageKey, draft); } catch { /* ignore */ }
          }
        })
        .catch(() => {
          if (currentKeyRef.current !== key) return;
          setAiDraft('');
          setDraftLoading(false);
        });
    } else {
      setDraftLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey]);

  // Smooth-scroll to bottom whenever the user sends a new local message
  useEffect(() => {
    if (localMessages.length > 0) {
      threadBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages]);

  // De-duplicate: when the server returns a message we sent optimistically,
  // drop it from localMessages so it doesn't appear twice.
  useEffect(() => {
    if (localMessages.length === 0) return;
    // Build a set of recent "Me" message bodies already confirmed by the server
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const confirmedBodies = new Set(
      group.messages
        .filter(m => m.sender.name === 'Me' && m.timestamp.getTime() >= fiveMinutesAgo)
        .map(m => (m.body ?? m.preview).trim()),
    );
    if (confirmedBodies.size === 0) return;
    setLocalMessages(prev =>
      prev.filter(lm => !confirmedBodies.has((lm.body ?? lm.preview).trim())),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.messages]);

  const handleRegenerateDraft = useCallback((tone: DraftTone = 'friendly') => {
    setAiDraft('');
    setDraftLoading(true);
    // Invalidate both in-session cache and localStorage so next visit also re-fetches
    aiCacheRef.current.delete(conversationKey);

    const latestMsg = group.messages[group.messages.length - 1];
    if (!latestMsg?.id) return;
    // Clear localStorage entry so regenerated draft replaces the old one
    try { localStorage.removeItem(`ai-draft:${latestMsg.id}`); } catch { /* ignore */ }

    fetch('/api/ai/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: latestMsg.id, tone }),
    })
      .then(r => r.json())
      .then(d => {
        const draft = d.draft || '';
        setAiDraft(draft);
        setDraftLoading(false);
        aiCacheRef.current.set(conversationKey, { draft });
        if (draft) {
          try { localStorage.setItem(`ai-draft:${latestMsg.id}`, draft); } catch { /* ignore */ }
        }
      })
      .catch(() => { setAiDraft(''); setDraftLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationKey, group.messages]);

  const addLocalMessage = useCallback((text: string) => {
    const msg: Message = {
      id: `local-${Date.now()}`,
      channel: group.channel,
      sender: { name: 'Me', avatar: '', online: true },
      preview: text,
      body: text,
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
    // Show optimistically right away
    addLocalMessage(text);
    // Persist to DB via Mode A (conversationId-based save)
    if (group.conversationId) {
      fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: group.conversationId, text, channel: group.channel }),
      }).catch(() => {});
    }
  };

  const handleReact = (msgId: string, emoji: string) => {
    setReactions(prev => ({
      ...prev,
      [msgId]: {
        ...(prev[msgId] || {}),
        [emoji]: ((prev[msgId] || {})[emoji] || 0) + 1,
      },
    }));
  };

  const handleForward = (text: string) => {
    setForwardToast(text.slice(0, 40) + (text.length > 40 ? '…' : ''));
    setTimeout(() => setForwardToast(null), 2500);
  };

  const channelLabel = group.channel === 'gmail' ? 'Gmail'
    : group.channel === 'whatsapp' ? 'WhatsApp'
    : group.channel === 'telegram' ? 'Telegram'
    : group.channel === 'slack' ? 'Slack'
    : group.channel;

  const allMessages = [...group.messages, ...localMessages];
  const dayGroups = groupByDay(allMessages);
  const lastMyMsgId = [...allMessages].reverse().find(m => m.sender.name === 'Me')?.id;

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* ── Main conversation column ──────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* ── Header ──────────────────────────────────────────── */}
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
              <p className="text-xs text-gray-400">
                {group.senderOnline ? (
                  <span className="text-green-500 font-medium">Online</span>
                ) : (
                  getRelativeTime(group.latestTimestamp)
                )}
              </p>
            )}
          </div>

          {group.topicLabel && (
            <span className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-medium ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
              {group.topicLabel}
            </span>
          )}

          {/* Action icons */}
          <div className="flex items-center gap-1 shrink-0">
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" title="Voice call">
              <Phone size={16} />
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" title="Video call">
              <Video size={16} />
            </button>
            <button className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-colors" title="More options">
              <MoreHorizontal size={16} />
            </button>
          </div>
        </div>

        {/* ── Chat thread ───────────────────────────────────── */}
        <div className={`flex-1 overflow-y-auto py-4 space-y-1 ${group.channel === 'slack' ? 'px-0 bg-white dark:bg-gray-900' : 'px-4 bg-[#f0f2f5] dark:bg-gray-800'}`}>
          {dayGroups.map(({ date, messages: dayMsgs }) => (
            <div key={date.toISOString()}>
              <div className={`flex items-center gap-3 my-4 ${group.channel === 'slack' ? 'px-4' : ''}`}>
                <div className="flex-1 h-px bg-gray-300/60" />
                <span className={`text-[11px] text-gray-400 font-medium shrink-0 px-2 ${group.channel === 'slack' ? 'bg-white dark:bg-gray-900' : 'bg-[#f0f2f5] dark:bg-gray-800'}`}>{formatDateSeparator(date)}</span>
                <div className="flex-1 h-px bg-gray-300/60" />
              </div>

              <div className={group.channel === 'slack' ? 'space-y-0' : 'space-y-0.5'}>
                {dayMsgs.map((msg, idx) => {
                  const isMe = msg.sender.name === 'Me';
                  const isFirst = idx === 0 || dayMsgs[idx - 1].sender.name !== msg.sender.name;
                  const isLast = idx === dayMsgs.length - 1 || dayMsgs[idx + 1].sender.name !== msg.sender.name;
                  const isLastMyMsg = msg.id === lastMyMsgId;
                  const msgReactions = reactions[msg.id || String(idx)] || {};
                  const hasReactions = Object.keys(msgReactions).length > 0;
                  const msgId = msg.id || String(idx);
                  // Use full body when available; fall back to (possibly truncated) preview
                  const msgBody = msg.body ?? msg.preview;
                  const isImage = isImageUrl(msgBody, msg.messageType);
                  const isVoice = !isImage && isVoiceUrl(msgBody, msg.messageType);
                  const isMedia = isImage || isVoice;
                  const threadCount = msg.thread?.messages?.length ?? 0;
                  const isThreadOpen = selectedThread?.id === msg.id;

                  // ── System event (tapback / rename / group change) ─
                  // Render as a small centered gray pill — no chat bubble.
                  if (msg.isSystemEvent) {
                    return (
                      <div key={msgId} className="flex items-center justify-center py-1">
                        <span className="text-[11px] text-gray-400 italic px-3 py-0.5 bg-gray-100/80 rounded-full max-w-[80%] text-center leading-relaxed">
                          {msgBody}
                        </span>
                      </div>
                    );
                  }

                  // ── Slack-style layout ─────────────────────────────
                  if (group.channel === 'slack') {
                    return (
                      <div
                        key={msgId}
                        className={`flex items-start gap-3 px-4 py-0.5 transition-colors relative group/msg ${isFirst ? 'mt-3 pt-1' : ''} ${isThreadOpen ? 'bg-[#fff8e1]' : 'hover:bg-gray-50'}`}
                      >
                        {/* Avatar column — always visible on first msg, spacer on subsequent */}
                        <div className="w-9 shrink-0 flex items-start pt-0.5">
                          {isFirst ? (
                            <Avatar src={msg.sender.avatar} name={msg.sender.name} size="sm" />
                          ) : (
                            <span className="w-9 text-[10px] text-gray-300 text-right leading-5 opacity-0 group-hover/msg:opacity-100 transition-opacity select-none">
                              {formatTime(msg.timestamp)}
                            </span>
                          )}
                        </div>

                        {/* Message body */}
                        <div className="flex-1 min-w-0 relative">
                          <HoverActions
                            isMe={isMe}
                            msgId={msgId}
                            text={msgBody}
                            reactions={msgReactions}
                            onReact={(emoji) => handleReact(msgId, emoji)}
                            onForward={() => handleForward(msgBody)}
                            onCopy={() => {}}
                            slackLayout
                          />

                          {isFirst && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className={`text-sm font-semibold ${isMe ? 'text-blue-600' : 'text-gray-900'}`}>
                                {isMe ? 'You' : msg.sender.name}
                              </span>
                              <span className="text-[11px] text-gray-400">{formatTime(msg.timestamp)}</span>
                              {msg.subject && (
                                <span className="text-[11px] text-gray-400 italic">{msg.subject}</span>
                              )}
                            </div>
                          )}

                          {isImage ? (
                            <img
                              src={resolveImageSrc(msgBody)}
                              alt="Shared image"
                              className="max-w-xs rounded-lg shadow-sm object-cover mt-1"
                              style={{ maxHeight: 280 }}
                            />
                          ) : isVoice ? (
                            <audio controls src={msgBody} className="mt-1 h-10 max-w-xs" />
                          ) : (
                            <p className="text-sm text-gray-800 leading-relaxed break-words whitespace-pre-wrap">{msgBody}</p>
                          )}

                          {hasReactions && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {Object.entries(msgReactions).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msgId, emoji)}
                                  className="flex items-center gap-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-md px-1.5 py-0.5 text-xs transition-colors"
                                >
                                  <span>{emoji}</span>
                                  <span className="text-gray-600 text-[10px] ml-0.5">{count}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Thread replies link — like real Slack */}
                          {threadCount > 0 && (
                            <button
                              onClick={() => setSelectedThread(isThreadOpen ? null : msg)}
                              className={`flex items-center gap-1.5 mt-1.5 text-[12px] font-medium rounded px-1 py-0.5 -ml-1 transition-colors ${
                                isThreadOpen
                                  ? 'text-[#1264a3] bg-[#e8f0f8]'
                                  : 'text-[#1264a3] hover:bg-gray-100'
                              }`}
                            >
                              <span>{threadCount} {threadCount === 1 ? 'reply' : 'replies'}</span>
                              <span className="text-gray-400 font-normal">
                                · Last reply {formatTime(msg.thread!.messages[threadCount - 1].timestamp)}
                              </span>
                              <span className="text-[#1264a3] text-[11px]">View thread →</span>
                            </button>
                          )}

                          {isMe && isLastMyMsg && isLast && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Sent</p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // ── iMessage-style bubbles (all other channels) ────
                  if (isMe) {
                    return (
                      <div key={msgId} className={`flex items-end justify-end gap-2 ${isFirst ? 'mt-3' : 'mt-0.5'}`}>
                        <div className="max-w-[72%] flex flex-col items-end relative group/msg">
                          <HoverActions
                            isMe
                            msgId={msgId}
                            text={msgBody}
                            reactions={msgReactions}
                            onReact={(emoji) => handleReact(msgId, emoji)}
                            onForward={() => handleForward(msgBody)}
                            onCopy={() => {}}
                          />

                          {isFirst && (
                            <p className="text-[11px] text-gray-400 font-medium mb-1 mr-1">You</p>
                          )}

                          {isImage ? (
                            <img
                              src={resolveImageSrc(msgBody)}
                              alt="Shared image"
                              className={`max-w-full rounded-2xl rounded-br-sm shadow-sm object-cover`}
                              style={{ maxHeight: 280 }}
                            />
                          ) : isVoice ? (
                            <audio controls src={msgBody} className="h-10 max-w-xs" />
                          ) : (
                            <div className={`
                              px-3.5 py-2.5 text-sm text-white leading-relaxed shadow-sm
                              bg-[#0b5cff]
                              ${isFirst && isLast ? 'rounded-2xl rounded-br-md' : ''}
                              ${isFirst && !isLast ? 'rounded-2xl rounded-br-sm rounded-b-lg' : ''}
                              ${!isFirst && !isLast ? 'rounded-lg rounded-r-sm' : ''}
                              ${!isFirst && isLast ? 'rounded-2xl rounded-tr-sm rounded-t-lg rounded-br-md' : ''}
                            `}>
                              <span className="whitespace-pre-wrap break-words">{msgBody}</span>
                            </div>
                          )}

                          {/* Reactions bubble */}
                          {hasReactions && (
                            <div className="flex gap-0.5 mt-1 mr-1">
                              {Object.entries(msgReactions).map(([emoji, count]) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleReact(msgId, emoji)}
                                  className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm hover:bg-gray-50 transition-colors"
                                >
                                  <span>{emoji}</span>
                                  {count > 1 && <span className="text-gray-500 text-[10px]">{count}</span>}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Sent status */}
                          {isLast && (
                            <div className="flex items-center gap-1 mt-0.5 mr-1">
                              <p className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</p>
                              {isLastMyMsg && (
                                <span className="text-[10px] text-gray-400">· Sent</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msgId} className={`flex items-end gap-2 ${isFirst ? 'mt-3' : 'mt-0.5'}`}>
                      <div className="w-8 shrink-0 flex items-end">
                        {isLast ? (
                          <Avatar src={msg.sender.avatar} name={msg.sender.name} size="sm" />
                        ) : (
                          <div className="w-8" />
                        )}
                      </div>

                      <div className="max-w-[72%] flex flex-col relative group/msg">
                        <HoverActions
                          isMe={false}
                          msgId={msgId}
                          text={msgBody}
                          reactions={msgReactions}
                          onReact={(emoji) => handleReact(msgId, emoji)}
                          onForward={() => handleForward(msgBody)}
                          onCopy={() => {}}
                        />

                        {isFirst && (
                          <p className="text-[11px] text-gray-500 font-medium mb-1 ml-1">{msg.sender.name}</p>
                        )}
                        {msg.subject && isFirst && (
                          <p className="text-[11px] text-gray-500 font-medium mb-1 ml-1 italic">{msg.subject}</p>
                        )}

                        {isImage ? (
                          <img
                            src={resolveImageSrc(msgBody)}
                            alt="Shared image"
                            className="max-w-full rounded-2xl rounded-bl-sm shadow-sm object-cover"
                            style={{ maxHeight: 280 }}
                          />
                        ) : isVoice ? (
                          <audio controls src={msgBody} className="h-10 max-w-xs" />
                        ) : (
                          <div className={`
                            px-3.5 py-2.5 text-sm text-gray-800 leading-relaxed shadow-sm
                            bg-white border border-gray-100
                            ${isFirst && isLast ? 'rounded-2xl rounded-bl-md' : ''}
                            ${isFirst && !isLast ? 'rounded-2xl rounded-bl-sm rounded-b-lg' : ''}
                            ${!isFirst && !isLast ? 'rounded-lg rounded-l-sm' : ''}
                            ${!isFirst && isLast ? 'rounded-2xl rounded-tl-sm rounded-t-lg rounded-bl-md' : ''}
                          `}>
                            <span className="whitespace-pre-wrap break-words">{msgBody}</span>
                          </div>
                        )}

                        {hasReactions && (
                          <div className="flex gap-0.5 mt-1 ml-1">
                            {Object.entries(msgReactions).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => handleReact(msgId, emoji)}
                                className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm hover:bg-gray-50 transition-colors"
                              >
                                <span>{emoji}</span>
                                {count > 1 && <span className="text-gray-500 text-[10px]">{count}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                        {isLast && (
                          <p className="text-[10px] text-gray-400 mt-0.5 ml-1">{formatTime(msg.timestamp)}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div ref={threadBottomRef} />
        </div>

        {/* Forward toast */}
        {forwardToast && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-2 rounded-xl shadow-lg z-50 pointer-events-none">
            Forwarded: &ldquo;{forwardToast}&rdquo;
          </div>
        )}

        {/* ── AI Reply Box ───────────────────────────────────── */}
        {!aiDraftDismissed && (draftLoading || aiDraft) && (
          <div className="px-4 pt-3 pb-1 bg-white border-t border-gray-100 shrink-0">
            <AIReplyBox
              suggestedReply={aiDraft}
              loading={draftLoading}
              onSend={handleSendDraft}
              onRegenerate={(tone) => handleRegenerateDraft(tone)}
              onDismiss={() => setAiDraftDismissed(true)}
            />
          </div>
        )}

        {/* ── Compose bar ───────────────────────────────────── */}
        <ReplyToolbar
          recipientName={group.senderName}
          channel={group.channel}
          channelLabel={channelLabel}
          conversationId={group.conversationId}
          externalId={group.externalId}
          onMessageSent={addLocalMessage}
        />
      </div>

      {/* ── Slack Thread Panel ─────────────────────────────── */}
      {selectedThread && group.channel === 'slack' && (
        <ThreadPanel
          parentMsg={selectedThread}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}
