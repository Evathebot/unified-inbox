'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Loader2, Plus, Smile, Mic, MicOff, Image, Paperclip, Camera, X, Check,
} from 'lucide-react';

interface ReplyToolbarProps {
  recipientName: string;
  channel: string;
  channelLabel?: string;
  conversationId?: string;   // DB conversation UUID
  externalId?: string;       // Beeper chat ID for browser-side send
  onMessageSent?: (text: string) => void;
}

type SendState = 'idle' | 'sending' | 'sent' | 'error' | 'not_connected';

const EMOJI_LIST = [
  '😀','😂','🥰','😎','🤔','😅','🙌','👏','🔥','❤️',
  '✅','🎉','👍','👎','😢','😡','🤯','🥳','😴','🫡',
  '💯','⚡','🌟','💪','🙏','😬','🤣','😇','🥺','🫶',
];

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Cache the Beeper token in memory so we don't refetch on every send. */
let cachedBeeperToken: { apiUrl: string; accessToken: string } | null = null;
let tokenFetchedAt = 0;
const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getBeeperToken(): Promise<{ apiUrl: string; accessToken: string } | null> {
  if (cachedBeeperToken && Date.now() - tokenFetchedAt < TOKEN_TTL_MS) {
    return cachedBeeperToken;
  }
  try {
    const res = await fetch('/api/beeper/token');
    if (!res.ok) return null;
    const data = await res.json();
    if (data.apiUrl && data.accessToken) {
      cachedBeeperToken = { apiUrl: data.apiUrl, accessToken: data.accessToken };
      tokenFetchedAt = Date.now();
      return cachedBeeperToken;
    }
  } catch { /* ignore */ }
  return null;
}

export default function ReplyToolbar({
  recipientName,
  channel,
  channelLabel,
  conversationId,
  externalId,
  onMessageSent,
}: ReplyToolbarProps) {
  const [replyText, setReplyText] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');

  // Attachment menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Audio recording
  const [isRecording, setIsRecording] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Reset state when conversation changes
  useEffect(() => {
    setReplyText('');
    setSendState('idle');
    setShowAttachMenu(false);
    setShowEmojiPicker(false);
  }, [conversationId]);

  // Audio timer
  useEffect(() => {
    if (isRecording) {
      setAudioSeconds(0);
      timerRef.current = setInterval(() => setAudioSeconds(s => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlobUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setIsRecording(true);
      setAudioBlobUrl(null);
    } catch {
      // microphone denied — silently ignore
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const cancelAudio = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    setAudioBlobUrl(null);
    setAudioSeconds(0);
  };

  // Voice send: show a placeholder message (actual audio upload to Beeper not yet supported)
  const sendAudio = () => {
    if (!audioBlobUrl) return;
    onMessageSent?.('[🎙️ Voice message]');
    setAudioBlobUrl(null);
    setAudioSeconds(0);
    setSendState('sent');
    setTimeout(() => setSendState('idle'), 2500);
  };

  /**
   * Primary send handler.
   *
   * When we have a Beeper externalId, we send directly from the browser to
   * Beeper Desktop (localhost:23373) — the server can't do this in production.
   * On success we POST to /api/conversations/send to persist the message to DB.
   *
   * Fallback: if no externalId (e.g., non-Beeper conversation), we post to the
   * server which returns guidance on how to proceed.
   */
  const handleSend = useCallback(async () => {
    const text = replyText.trim();
    if (!text || sendState === 'sending') return;

    setSendState('sending');
    setReplyText('');

    try {
      // ── Path 1: Browser-side send via Beeper Desktop ──────────────────
      if (externalId) {
        const token = await getBeeperToken();

        if (!token) {
          // No Beeper connection
          setSendState('not_connected');
          setReplyText(text);
          setTimeout(() => setSendState('idle'), 4000);
          return;
        }

        const encodedChatId = encodeURIComponent(externalId);
        const beeperRes = await fetch(`${token.apiUrl}/v1/chats/${encodedChatId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text }),
          signal: AbortSignal.timeout(10000),
        });

        if (!beeperRes.ok) {
          const errText = await beeperRes.text().catch(() => '');
          console.error('[Send] Beeper send failed:', beeperRes.status, errText);
          throw new Error(`Beeper returned ${beeperRes.status}`);
        }

        const sentMsg = await beeperRes.json().catch(() => null);

        // Persist to DB (best-effort — message was already delivered)
        if (conversationId) {
          fetch('/api/conversations/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              conversationId,
              text,
              channel,
              externalMessageId: sentMsg?.id,
            }),
          }).catch(() => {});
        }

        setSendState('sent');
        onMessageSent?.(text);
        setTimeout(() => setSendState('idle'), 2500);
        return;
      }

      // ── Path 2: No externalId — server-side fallback ──────────────────
      const res = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderName: recipientName, channel, text }),
      });
      if (!res.ok) throw new Error('Send failed');
      const data = await res.json();

      if (data.demo) {
        setSendState('not_connected');
        setReplyText(text);
        setTimeout(() => setSendState('idle'), 4000);
        return;
      }

      setSendState('sent');
      onMessageSent?.(text);
      setTimeout(() => setSendState('idle'), 2500);
    } catch (err) {
      console.error('[Send] error:', err);
      setSendState('error');
      setReplyText(text);
      setTimeout(() => setSendState('idle'), 3000);
    }
  }, [replyText, sendState, externalId, conversationId, channel, recipientName, onMessageSent]);

  const insertEmoji = (emoji: string) => {
    const ta = textareaRef.current;
    if (!ta) { setReplyText(p => p + emoji); return; }
    const start = ta.selectionStart ?? replyText.length;
    const end = ta.selectionEnd ?? start;
    const next = replyText.slice(0, start) + emoji + replyText.slice(end);
    setReplyText(next);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + emoji.length, start + emoji.length); }, 0);
  };

  const platformLabel = channelLabel || channel;

  // ── Sent state ────────────────────────────────────────────
  if (sendState === 'sent') {
    return (
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 py-4 text-green-600 text-sm font-medium">
          <Check size={15} />
          Sent
        </div>
      </div>
    );
  }

  if (sendState === 'error') {
    return (
      <div className="bg-white border-t border-gray-200">
        <div className="flex items-center justify-center gap-2 py-4 text-red-500 text-sm">
          Failed to send — check your Beeper connection in Settings
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
          Beeper not connected —{' '}
          <a href="/settings" className="underline hover:text-amber-700">open Settings</a>
        </div>
      </div>
    );
  }

  const isSending = sendState === 'sending';

  // ── Audio recording UI ───────────────────────────────────
  if (isRecording || audioBlobUrl) {
    return (
      <div className="bg-white border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-3">
          <button onClick={cancelAudio} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <X size={16} />
          </button>

          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 flex items-center gap-3">
            {isRecording ? (
              <>
                <span className="flex gap-0.5 items-end h-5">
                  {[3,5,7,4,6,8,5,3,6,4].map((h, i) => (
                    <span key={i} className="w-0.5 rounded-full bg-red-400 voice-bar" style={{ height: h * 2 + 'px', animationDelay: `${i * 0.08}s` }} />
                  ))}
                </span>
                <span className="text-xs text-red-500 font-mono tabular-nums">{formatAudioTime(audioSeconds)}</span>
                <span className="ml-auto text-xs text-red-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 recording-dot" />
                  Recording
                </span>
              </>
            ) : (
              <audio src={audioBlobUrl!} controls className="h-7 w-full" />
            )}
          </div>

          {isRecording ? (
            <button
              onClick={stopRecording}
              className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors"
              title="Stop recording"
            >
              <MicOff size={16} />
            </button>
          ) : (
            <button
              onClick={sendAudio}
              className="w-9 h-9 rounded-full ai-badge flex items-center justify-center text-white"
              title="Send voice message"
            >
              <Send size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Default compose bar ──────────────────────────────────
  return (
    <div className="bg-white border-t border-gray-200 px-3 py-3 relative">
      {/* Hidden file input for attachments */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            // For now, insert filename as placeholder text until full file upload is implemented
            setReplyText(prev => prev ? `${prev} [${file.name}]` : `[${file.name}]`);
            e.target.value = '';
          }
          setShowAttachMenu(false);
        }}
      />

      <div className="flex items-end gap-2">
        {/* Plus / Attachments */}
        <div className="relative shrink-0" ref={attachMenuRef}>
          <button
            onClick={() => { setShowAttachMenu(p => !p); setShowEmojiPicker(false); }}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            title="Attach"
          >
            <Plus size={18} />
          </button>
          {showAttachMenu && (
            <div className="absolute bottom-11 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-30 min-w-[160px]">
              <button
                onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*,video/*'); fileInputRef.current?.click(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
              >
                <Image size={16} className="text-blue-500" /> Photo & Video
              </button>
              <button
                onClick={() => { fileInputRef.current?.setAttribute('accept', 'image/*'); fileInputRef.current?.click(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
              >
                <Camera size={16} className="text-green-500" /> Camera
              </button>
              <button
                onClick={() => { fileInputRef.current?.setAttribute('accept', '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt'); fileInputRef.current?.click(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
              >
                <Paperclip size={16} className="text-orange-500" /> Document
              </button>
            </div>
          )}
        </div>

        {/* Text input area */}
        <div className="flex-1 relative">
          {/* Emoji picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full mb-2 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg p-2 z-30">
              <div className="grid grid-cols-10 gap-0.5">
                {EMOJI_LIST.map(e => (
                  <button
                    key={e}
                    onClick={() => insertEmoji(e)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-lg transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-end bg-gray-100 rounded-2xl px-3 py-2 gap-2">
            <button
              onClick={() => { setShowEmojiPicker(p => !p); setShowAttachMenu(false); }}
              className="shrink-0 text-gray-400 hover:text-yellow-500 transition-colors self-end mb-0.5"
              title="Emoji"
            >
              <Smile size={18} />
            </button>

            <textarea
              ref={textareaRef}
              data-reply-textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder={`Message ${recipientName} on ${platformLabel}…`}
              rows={1}
              disabled={isSending}
              className="flex-1 bg-transparent text-sm text-gray-800 resize-none focus:outline-none placeholder-gray-400 min-h-[24px] max-h-[120px] disabled:opacity-60 leading-relaxed"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
          </div>
        </div>

        {/* Send / Mic */}
        <div className="relative shrink-0">
          {replyText.trim() ? (
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-9 h-9 rounded-full ai-badge text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
              title="Send (Enter)"
            >
              {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              title="Record voice message"
            >
              <Mic size={17} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
