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
  const [darkMode, setDarkMode] = useState(true);

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
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Channel Connections</h2>
          
          <div className="space-y-4">
            {channels.map((channelStatus, idx) => (
              <div
                key={channelStatus.channel}
                className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-200"
              >
                <div className="flex items-center gap-4">
                  <ChannelBadge channel={channelStatus.channel} size="lg" />
                  <div>
                    <p className="text-gray-900 font-semibold">{channelStatus.name}</p>
                    {channelStatus.connected && channelStatus.lastSync && (
                      <p className="text-sm text-gray-500">Last synced: {channelStatus.lastSync}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {channelStatus.connected ? (
                    <>
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Check size={16} />
                        <span>Connected</span>
                      </div>
                      <button
                        onClick={() => toggleChannel(idx)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all text-sm"
                      >
                        Disconnect
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-gray-500 text-sm">
                        <X size={16} />
                        <span>Not connected</span>
                      </div>
                      <button
                        onClick={() => toggleChannel(idx)}
                        className="px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 text-gray-900 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm"
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
            <Zap className="text-purple-400" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">AI Preferences</h2>
          </div>

          <div className="space-y-6">
            {/* Auto-draft toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold mb-1">Auto-draft Replies</p>
                <p className="text-sm text-gray-500">
                  Automatically generate AI-powered reply suggestions
                </p>
              </div>
              <button
                onClick={() => setAutoDraft(!autoDraft)}
                className={`
                  w-14 h-8 rounded-full transition-all duration-200
                  ${autoDraft ? 'bg-purple-500' : 'bg-gray-600'}
                `}
              >
                <div className={`
                  w-6 h-6 bg-white rounded-full transition-all duration-200 transform
                  ${autoDraft ? 'translate-x-7' : 'translate-x-1'}
                `} />
              </button>
            </div>

            {/* Priority score sensitivity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-900 font-semibold mb-1">Priority Scoring Sensitivity</p>
                  <p className="text-sm text-gray-500">
                    Minimum score to mark messages as high priority
                  </p>
                </div>
                <span className="text-gray-900 font-bold">{priorityScore}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={priorityScore}
                onChange={(e) => setPriorityScore(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:bg-purple-500
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
            </div>
          </div>
        </GlassCard>

        {/* Notification Preferences */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="text-blue-400" size={24} />
            <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-900 font-semibold mb-1">Push Notifications</p>
                <p className="text-sm text-gray-500">
                  Receive notifications for new messages
                </p>
              </div>
              <button
                onClick={() => setNotifications(!notifications)}
                className={`
                  w-14 h-8 rounded-full transition-all duration-200
                  ${notifications ? 'bg-blue-500' : 'bg-gray-600'}
                `}
              >
                <div className={`
                  w-6 h-6 bg-white rounded-full transition-all duration-200 transform
                  ${notifications ? 'translate-x-7' : 'translate-x-1'}
                `} />
              </button>
            </div>

            <div className="pl-4 space-y-3 text-sm">
              <label className="flex items-center gap-3 text-gray-600">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span>High priority messages</span>
              </label>
              <label className="flex items-center gap-3 text-gray-600">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded" />
                <span>Mentions and replies</span>
              </label>
              <label className="flex items-center gap-3 text-gray-600">
                <input type="checkbox" className="w-4 h-4 rounded" />
                <span>All new messages</span>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* Appearance */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            {darkMode ? <Moon className="text-indigo-400" size={24} /> : <Sun className="text-yellow-400" size={24} />}
            <h2 className="text-2xl font-bold text-gray-900">Appearance</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-900 font-semibold mb-1">Dark Mode</p>
              <p className="text-sm text-gray-500">
                Use dark theme for better visibility
              </p>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`
                w-14 h-8 rounded-full transition-all duration-200
                ${darkMode ? 'bg-indigo-500' : 'bg-gray-600'}
              `}
            >
              <div className={`
                w-6 h-6 bg-white rounded-full transition-all duration-200 transform
                ${darkMode ? 'translate-x-7' : 'translate-x-1'}
              `} />
            </button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
