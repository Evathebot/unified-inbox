'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Plus, Smile, Mic, MicOff, Clock,
  Image, Paperclip, Camera, X, Check,
} from 'lucide-react';

interface ReplyToolbarProps {
  recipientName: string;
  channel: string;
  channelLabel?: string;
  onMessageSent?: (text: string) => void;
}

type SendState = 'idle' | 'sending' | 'sent' | 'error' | 'not_connected';

const EMOJI_LIST = [
  '😀','😂','🥰','😎','🤔','😅','🙌','👏','🔥','❤️',
  '✅','🎉','👍','👎','😢','😡','🤯','🥳','😴','🫡',
  '💯','⚡','🌟','💪','🙏','😬','🤣','😇','🥺','🫶',
];

const SEND_LATER_OPTIONS = [
  { label: 'In 1 hour', minutes: 60 },
  { label: 'Tomorrow 9 AM', minutes: null, special: 'tomorrow9am' },
  { label: 'Monday 9 AM', minutes: null, special: 'monday9am' },
  { label: 'This evening 6 PM', minutes: null, special: 'evening6pm' },
];

function formatAudioTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export default function ReplyToolbar({
  recipientName,
  channel,
  channelLabel,
  onMessageSent,
}: ReplyToolbarProps) {
  const [replyText, setReplyText] = useState('');
  const [sendState, setSendState] = useState<SendState>('idle');

  // Attachment menu
  const [showAttachMenu, setShowAttachMenu] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  // Send later
  const [showSendLater, setShowSendLater] = useState(false);
  const [scheduledToast, setScheduledToast] = useState<string | null>(null);

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
  const sendLaterRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) setShowEmojiPicker(false);
      if (sendLaterRef.current && !sendLaterRef.current.contains(e.target as Node)) setShowSendLater(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        const url = URL.createObjectURL(blob);
        setAudioBlobUrl(url);
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

  const sendAudio = () => {
    if (!audioBlobUrl) return;
    onMessageSent?.('[🎙️ Voice message]');
    setAudioBlobUrl(null);
    setAudioSeconds(0);
    setSendState('sent');
    setTimeout(() => setSendState('idle'), 2500);
  };

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
        setSendState('not_connected');
        setReplyText(text);
        setTimeout(() => setSendState('idle'), 4000);
        return;
      }

      setSendState('sent');
      onMessageSent?.(text);
      setTimeout(() => setSendState('idle'), 2500);
    } catch {
      setSendState('error');
      setReplyText(text);
      setTimeout(() => setSendState('idle'), 3000);
    }
  };

  const handleSendLater = (option: typeof SEND_LATER_OPTIONS[number]) => {
    setShowSendLater(false);
    setScheduledToast(`Scheduled for ${option.label}`);
    setTimeout(() => setScheduledToast(null), 3000);
    setReplyText('');
  };

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

  // ── Audio recording UI ───────────────────────────────────
  if (isRecording || audioBlobUrl) {
    return (
      <div className="bg-white border-t border-gray-200 px-3 py-3">
        <div className="flex items-center gap-3">
          {/* Cancel */}
          <button onClick={cancelAudio} className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors">
            <X size={16} />
          </button>

          {/* Waveform / player */}
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
              <>
                <audio src={audioBlobUrl!} controls className="h-7 w-full" />
              </>
            )}
          </div>

          {/* Stop / Send */}
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
      {/* Scheduled toast */}
      {scheduledToast && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-3 py-1.5 rounded-xl shadow z-50 whitespace-nowrap flex items-center gap-1.5">
          <Clock size={11} /> {scheduledToast}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Plus / Attachments */}
        <div className="relative shrink-0" ref={attachMenuRef}>
          <button
            onClick={() => { setShowAttachMenu(p => !p); setShowEmojiPicker(false); setShowSendLater(false); }}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
            title="Attach"
          >
            <Plus size={18} />
          </button>
          {showAttachMenu && (
            <div className="absolute bottom-11 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-30 min-w-[160px]">
              <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                <Image size={16} className="text-blue-500" /> Photo & Video
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
                <Camera size={16} className="text-green-500" /> Camera
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors">
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
            {/* Emoji button inside input */}
            <button
              onClick={() => { setShowEmojiPicker(p => !p); setShowAttachMenu(false); setShowSendLater(false); }}
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

        {/* Send / Send later */}
        <div className="relative shrink-0" ref={sendLaterRef}>
          {replyText.trim() ? (
            <div className="flex items-center">
              <button
                onClick={handleSend}
                disabled={isSending}
                className="w-9 h-9 rounded-full ai-badge text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-50"
                title="Send"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />}
              </button>
              <button
                onClick={() => { setShowSendLater(p => !p); setShowAttachMenu(false); setShowEmojiPicker(false); }}
                className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 transition-colors -ml-1 -mt-3 z-10 relative"
                title="Send later"
              >
                <Clock size={10} />
              </button>
            </div>
          ) : (
            <button
              onClick={startRecording}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              title="Record"
            >
              <Mic size={17} />
            </button>
          )}

          {/* Send later dropdown */}
          {showSendLater && replyText.trim() && (
            <div className="absolute bottom-11 right-0 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-30 min-w-[180px]">
              <p className="text-[11px] text-gray-400 font-medium px-4 pt-2.5 pb-1">Send later</p>
              {SEND_LATER_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => handleSendLater(opt)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 text-sm text-gray-700 transition-colors"
                >
                  <Clock size={13} className="text-gray-400" />
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
