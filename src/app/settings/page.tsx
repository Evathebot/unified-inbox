'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Check, X, Bell, Zap, Moon, Sun, RefreshCw, Plug, ExternalLink, Loader2, LogOut } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import PlatformLogo from '@/components/PlatformLogo';

// All channels Beeper Desktop can bridge, in display order.
const ALL_CHANNELS: { id: string; name: string; platform: string }[] = [
  { id: 'whatsapp',   name: 'WhatsApp',          platform: 'whatsapp' },
  { id: 'telegram',   name: 'Telegram',           platform: 'telegram' },
  { id: 'signal',     name: 'Signal',             platform: 'signal' },
  { id: 'slack',      name: 'Slack',              platform: 'slack' },
  { id: 'instagram',  name: 'Instagram',          platform: 'instagram' },
  { id: 'messenger',  name: 'Messenger',          platform: 'messenger' },
  { id: 'linkedin',   name: 'LinkedIn',           platform: 'linkedin' },
  { id: 'discord',    name: 'Discord',            platform: 'discord' },
  { id: 'imessage',   name: 'iMessage',           platform: 'imessage' },
  { id: 'gmail',      name: 'Gmail',              platform: 'gmail' },
  { id: 'googlechat', name: 'Google Chat',        platform: 'googlechat' },
];

interface ChannelStatus {
  id: string;
  name: string;
  platform: string;
  connected: boolean;
  messageCount?: number;
  lastMessage?: string | null;
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-12 h-7 rounded-full transition-all duration-200 ${on ? 'bg-gray-900' : 'bg-gray-300'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full transition-all duration-200 transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type BeeperStatus = 'idle' | 'connecting' | 'syncing' | 'synced' | 'sync-error' | 'connect-error';

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // ── Current user ───────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // ── Beeper config ──────────────────────────────────────────
  const [beeperConnected, setBeeperConnected] = useState(false);
  const [beeperLastSync, setBeeperLastSync] = useState<string | null>(null);
  const [beeperStatus, setBeeperStatus] = useState<BeeperStatus>('idle');
  const [beeperError, setBeeperError] = useState('');
  const [syncStats, setSyncStats] = useState<{ conversations?: number; messages?: number; contacts?: number }>({});
  const [beeperApiUrl, setBeeperApiUrl] = useState('http://localhost:23373');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Channel statuses (from DB) ─────────────────────────────
  const [channels, setChannels] = useState<ChannelStatus[]>(
    ALL_CHANNELS.map(c => ({ ...c, connected: false }))
  );

  // ── Preferences ────────────────────────────────────────────
  const [autoDraft, setAutoDraft] = useState(true);
  const [priorityScore, setPriorityScore] = useState(60);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  // Sync preferences from localStorage on mount
  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains('dark'));
    const savedAutoDraft = localStorage.getItem('pref-autoDraft');
    const savedPriorityScore = localStorage.getItem('pref-priorityScore');
    const savedNotifications = localStorage.getItem('pref-notifications');
    if (savedAutoDraft !== null) setAutoDraft(savedAutoDraft === 'true');
    if (savedPriorityScore !== null) setPriorityScore(Number(savedPriorityScore));
    if (savedNotifications !== null) setNotifications(savedNotifications === 'true');
  }, []);

  const loadChannelStatuses = useCallback(() => {
    fetch('/api/channels/status')
      .then(r => r.json())
      .then(data => {
        const dbChannels: Record<string, { count: number; lastMessage: string | null }> =
          data.channels ?? {};
        setChannels(
          ALL_CHANNELS.map(c => ({
            ...c,
            connected: (dbChannels[c.id]?.count ?? 0) > 0,
            messageCount: dbChannels[c.id]?.count,
            lastMessage: dbChannels[c.id]?.lastMessage ?? null,
          }))
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // Handle OAuth redirect result
    const connected = searchParams.get('connected');
    const beeperError = searchParams.get('beeper_error');
    if (connected === 'true') {
      setBeeperConnected(true);
      // Strip query params from URL without triggering a reload
      router.replace('/settings', { scroll: false });
    } else if (beeperError) {
      const msgs: Record<string, string> = {
        authorization_denied: 'You denied authorization in Beeper Desktop.',
        token_exchange_failed: 'Token exchange failed — try reconnecting.',
        no_code: 'No authorization code received.',
        invalid_state: 'Security check failed — please try again.',
        no_code_verifier: 'PKCE verifier missing — please try connecting again.',
        server_error: 'Server error — check that Beeper Desktop is running.',
      };
      setBeeperError(msgs[beeperError] || `Connection error: ${beeperError}`);
      setBeeperStatus('connect-error');
      router.replace('/settings', { scroll: false });
    }

    // Load current user
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => { if (data.name) setCurrentUser({ name: data.name, email: data.email }); })
      .catch(() => {});

    // Load Beeper connection info
    fetch('/api/beeper/configure')
      .then(r => r.json())
      .then(data => {
        setBeeperConnected(data.connected ?? false);
        if (data.lastSyncAt) setBeeperLastSync(data.lastSyncAt);
      })
      .catch(() => {});

    // Load sync stats
    fetch('/api/sync')
      .then(r => r.json())
      .then(data => { if (data.stats) setSyncStats(data.stats); })
      .catch(() => {});

    loadChannelStatuses();
  }, [searchParams, router, loadChannelStatuses]);

  const handleConnectBeeper = async () => {
    setBeeperStatus('connecting');
    setBeeperError('');

    try {
      // 1. Ask server to generate PKCE state + code challenge (no localhost call)
      const initRes = await fetch('/api/beeper/connect');
      const initData = await initRes.json();
      if (!initData.state) {
        setBeeperError(initData.error || 'Failed to initialise connection');
        setBeeperStatus('connect-error');
        return;
      }
      const { state, codeVerifier, codeChallenge, redirectUri } = initData;

      // 2. Register OAuth client with Beeper Desktop — browser → localhost:23373
      //    (This works because the browser and Beeper Desktop are on the same Mac)
      let clientId: string;
      try {
        const regRes = await fetch(`${beeperApiUrl}/oauth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_name: 'Unified Inbox',
            redirect_uris: [redirectUri],
            grant_types: ['authorization_code'],
            response_types: ['code'],
            scope: 'read write',
          }),
        });
        if (!regRes.ok) throw new Error('Registration response not OK');
        const reg = await regRes.json();
        clientId = reg.client_id as string;
      } catch {
        setBeeperError(
          `Cannot reach Beeper Desktop at ${beeperApiUrl}. ` +
          'Make sure Beeper Desktop is running on this Mac.'
        );
        setBeeperStatus('connect-error');
        return;
      }

      // 3. Save clientId to server so the callback can use it if needed
      await fetch('/api/beeper/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, apiUrl: beeperApiUrl }),
      });

      // 4. Stash OAuth params in sessionStorage for the /beeper/callback page
      sessionStorage.setItem('beeper_oauth', JSON.stringify({
        codeVerifier,
        clientId,
        apiUrl: beeperApiUrl,
        redirectUri,
      }));

      // 5. Redirect browser to Beeper Desktop's consent page
      const authUrl = new URL(`${beeperApiUrl}/oauth/authorize`);
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'read write');
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      window.location.href = authUrl.toString();
    } catch {
      setBeeperError('Connection failed. Make sure Beeper Desktop is running on this Mac.');
      setBeeperStatus('connect-error');
    }
  };

  const handleSyncNow = async () => {
    setBeeperStatus('syncing');
    setBeeperError('');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      if (res.status === 401) {
        // Token expired — nudge towards reconnect
        setBeeperError(data.error || 'Token expired — click Reconnect to re-authorize.');
        setBeeperStatus('connect-error');
        return;
      }
      if (data.success) {
        setBeeperLastSync(new Date().toISOString());
        if (data.result) setSyncStats({ conversations: data.result.conversations, messages: data.result.messages, contacts: data.result.contacts });
        setBeeperStatus('synced');
        setTimeout(() => setBeeperStatus('idle'), 3000);
        loadChannelStatuses();
      } else {
        setBeeperError(data.error || 'Sync failed');
        setBeeperStatus('sync-error');
        setTimeout(() => setBeeperStatus('idle'), 4000);
      }
    } catch {
      setBeeperError('Sync failed. Is Beeper Desktop running?');
      setBeeperStatus('sync-error');
      setTimeout(() => setBeeperStatus('idle'), 4000);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const isBusy = beeperStatus === 'connecting' || beeperStatus === 'syncing';
  const isError = beeperStatus === 'connect-error' || beeperStatus === 'sync-error';

  const syncLabel = beeperStatus === 'syncing' ? 'Syncing…'
    : beeperStatus === 'synced' ? '✓ Synced'
    : 'Sync Now';

  const connectedChannels = channels.filter(c => c.connected);
  const disconnectedChannels = channels.filter(c => !c.connected);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-500">Manage your integrations and preferences</p>
          </div>
          {currentUser && (
            <div className="flex items-center gap-3 mt-1">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500">{currentUser.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 transition-colors px-3 py-2 rounded-lg hover:bg-gray-100"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          )}
        </div>

        {/* ── Beeper Connection ──────────────────────────────── */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <Plug size={20} className="text-purple-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Beeper Desktop</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Local relay that bridges WhatsApp, Telegram, Slack, and more
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${beeperConnected ? 'text-green-600' : 'text-gray-400'}`}>
              {beeperConnected ? <Check size={13} /> : <X size={13} />}
              <span>{beeperConnected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>

          {/* Sync stats — only when data exists */}
          {(syncStats.conversations || syncStats.messages) ? (
            <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
              {[
                { label: 'Conversations', value: syncStats.conversations ?? 0 },
                { label: 'Messages', value: syncStats.messages ?? 0 },
                { label: 'Contacts', value: syncStats.contacts ?? 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex-1 text-center">
                  <p className="text-lg font-bold text-gray-900">{value.toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          ) : null}

          {beeperConnected ? (
            /* ── Connected state ── */
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSyncNow}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 text-sm rounded-lg font-medium hover:bg-blue-100 transition-all disabled:opacity-60"
              >
                <RefreshCw size={13} className={beeperStatus === 'syncing' ? 'animate-spin' : ''} />
                {syncLabel}
              </button>
              <button
                onClick={handleConnectBeeper}
                disabled={isBusy}
                className="px-4 py-2 text-xs text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-60"
              >
                Reconnect
              </button>
              {beeperLastSync && (
                <span className="text-xs text-gray-400 ml-auto">
                  Last sync: {new Date(beeperLastSync).toLocaleTimeString()}
                </span>
              )}
            </div>
          ) : (
            /* ── Not connected state ── */
            <div>
              <p className="text-sm text-gray-500 mb-4 leading-relaxed">
                Beeper Desktop runs on your Mac and bridges WhatsApp, iMessage, Slack, Telegram,
                and more. Click below — your browser will contact Beeper directly to authorise.
              </p>

              {/* Advanced: custom API URL for ngrok / public tunnels */}
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(v => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showAdvanced ? '▾' : '▸'} Advanced
                </button>
                {showAdvanced && (
                  <div className="mt-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      Beeper Desktop API URL
                      <span className="ml-1 text-gray-400">(use ngrok URL if accessing remotely)</span>
                    </label>
                    <input
                      type="url"
                      value={beeperApiUrl}
                      onChange={e => setBeeperApiUrl(e.target.value.replace(/\/$/, ''))}
                      placeholder="http://localhost:23373"
                      className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={handleConnectBeeper}
                disabled={isBusy}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm rounded-xl font-medium hover:bg-gray-800 transition-all disabled:opacity-60"
              >
                {beeperStatus === 'connecting' ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ExternalLink size={15} />
                )}
                {beeperStatus === 'connecting' ? 'Opening Beeper…' : 'Connect Beeper Desktop'}
              </button>
            </div>
          )}

          {isError && beeperError && (
            <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{beeperError}</p>
          )}
        </GlassCard>

        {/* ── Channel Connections ────────────────────────────── */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Channel Connections</h2>
            <span className="text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-full px-3 py-1">
              {connectedChannels.length} of {channels.length} connected
            </span>
          </div>

          {/* Connected channels */}
          {connectedChannels.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">Active</p>
              {connectedChannels.map(ch => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-green-50 border border-green-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
                      <PlatformLogo platform={ch.platform} size={20} />
                    </div>
                    <div>
                      <p className="text-gray-900 font-semibold text-sm">{ch.name}</p>
                      <p className="text-xs text-gray-500">
                        {ch.messageCount?.toLocaleString()} messages
                        {ch.lastMessage ? ` · last ${timeAgo(ch.lastMessage)}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                    <Check size={13} />
                    <span>Connected</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Disconnected channels */}
          {disconnectedChannels.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-2">
                {connectedChannels.length > 0 ? 'Available via Beeper' : 'All channels — sync Beeper to connect'}
              </p>
              {disconnectedChannels.map(ch => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm opacity-50">
                      <PlatformLogo platform={ch.platform} size={20} />
                    </div>
                    <div>
                      <p className="text-gray-500 font-semibold text-sm">{ch.name}</p>
                      <p className="text-xs text-gray-400">No data synced yet</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                    <X size={13} />
                    <span>Not connected</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
            Channel connections are managed through <span className="font-medium text-gray-600">Beeper Desktop</span>.
            Sync Beeper above to pull in messages from any connected channel.
          </p>
        </GlassCard>

        {/* ── AI Preferences ─────────────────────────────────── */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="text-orange-500" size={22} />
            <h2 className="text-xl font-bold text-gray-900">AI Preferences</h2>
          </div>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold text-sm mb-0.5">Auto-draft Replies</p>
                <p className="text-xs text-gray-500">Automatically generate AI-powered reply suggestions</p>
              </div>
              <Toggle on={autoDraft} onChange={() => {
                const next = !autoDraft;
                setAutoDraft(next);
                localStorage.setItem('pref-autoDraft', String(next));
              }} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-900 font-semibold text-sm mb-0.5">Priority Scoring Sensitivity</p>
                  <p className="text-xs text-gray-500">Minimum score to mark messages as high priority</p>
                </div>
                <span className="text-gray-900 font-bold text-sm">{priorityScore}</span>
              </div>
              <input
                type="range" min="0" max="100" value={priorityScore}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setPriorityScore(val);
                  localStorage.setItem('pref-priorityScore', String(val));
                }}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-gray-900
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          </div>
        </GlassCard>

        {/* ── Notifications ──────────────────────────────────── */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-blue-500" size={22} />
            <h2 className="text-xl font-bold text-gray-900">Notifications</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold text-sm mb-0.5">Push Notifications</p>
                <p className="text-xs text-gray-500">Receive notifications for new messages</p>
              </div>
              <Toggle on={notifications} onChange={() => {
                const next = !notifications;
                setNotifications(next);
                localStorage.setItem('pref-notifications', String(next));
              }} />
            </div>
            <div className="pl-4 space-y-3 text-sm">
              <label className="flex items-center gap-3 text-gray-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                <span>High priority messages</span>
              </label>
              <label className="flex items-center gap-3 text-gray-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                <span>Mentions and replies</span>
              </label>
              <label className="flex items-center gap-3 text-gray-600 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500" />
                <span>All new messages</span>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* ── Appearance ─────────────────────────────────────── */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            {darkMode ? <Moon className="text-gray-600" size={22} /> : <Sun className="text-orange-400" size={22} />}
            <h2 className="text-xl font-bold text-gray-900">Appearance</h2>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-semibold text-sm mb-0.5">Dark Mode</p>
              <p className="text-xs text-gray-500">Use dark theme for reduced eye strain</p>
            </div>
            <Toggle on={darkMode} onChange={() => {
              const next = !darkMode;
              setDarkMode(next);
              document.documentElement.classList.toggle('dark', next);
              localStorage.setItem('theme', next ? 'dark' : 'light');
            }} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-6 flex items-center justify-center text-gray-400">Loading…</div>}>
      <SettingsContent />
    </Suspense>
  );
}
