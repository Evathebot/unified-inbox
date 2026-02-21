'use client';

import { useState } from 'react';
import { Check, X, Bell, Zap, Moon, Sun } from 'lucide-react';
import GlassCard from '@/components/GlassCard';
import ChannelBadge from '@/components/ChannelBadge';
import { Channel } from '@/lib/mockData';

interface ChannelStatus {
  channel: Channel;
  name: string;
  connected: boolean;
  lastSync?: string;
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

export default function SettingsPage() {
  const [channels, setChannels] = useState<ChannelStatus[]>([
    { channel: 'gmail', name: 'Gmail', connected: true, lastSync: '2 minutes ago' },
    { channel: 'whatsapp', name: 'WhatsApp', connected: true, lastSync: '5 minutes ago' },
    { channel: 'telegram', name: 'Telegram', connected: true, lastSync: '1 minute ago' },
    { channel: 'slack', name: 'Slack', connected: false },
  ]);

  const [autoDraft, setAutoDraft] = useState(true);
  const [priorityScore, setPriorityScore] = useState(60);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const toggleChannel = (index: number) => {
    const updated = [...channels];
    updated[index].connected = !updated[index].connected;
    setChannels(updated);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-500">Manage your integrations and preferences</p>
        </div>

        {/* Channel Connections */}
        <GlassCard className="p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Channel Connections</h2>
          
          <div className="space-y-3">
            {channels.map((channelStatus, idx) => (
              <div
                key={channelStatus.channel}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100"
              >
                <div className="flex items-center gap-4">
                  <ChannelBadge channel={channelStatus.channel} size="lg" />
                  <div>
                    <p className="text-gray-900 font-semibold text-sm">{channelStatus.name}</p>
                    {channelStatus.connected && channelStatus.lastSync && (
                      <p className="text-xs text-gray-500">Last synced: {channelStatus.lastSync}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {channelStatus.connected ? (
                    <>
                      <div className="flex items-center gap-1.5 text-green-600 text-xs font-medium">
                        <Check size={14} />
                        <span>Connected</span>
                      </div>
                      <button
                        onClick={() => toggleChannel(idx)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-xs font-medium"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                        <X size={14} />
                        <span>Not connected</span>
                      </div>
                      <button
                        onClick={() => toggleChannel(idx)}
                        className="px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all text-xs font-medium"
                      >
                        Connect
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* AI Preferences */}
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
              <Toggle on={autoDraft} onChange={() => setAutoDraft(!autoDraft)} />
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
                type="range"
                min="0"
                max="100"
                value={priorityScore}
                onChange={(e) => setPriorityScore(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-gray-900
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          </div>
        </GlassCard>

        {/* Notifications */}
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
              <Toggle on={notifications} onChange={() => setNotifications(!notifications)} />
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

        {/* Appearance */}
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
            <Toggle on={darkMode} onChange={() => setDarkMode(!darkMode)} />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
