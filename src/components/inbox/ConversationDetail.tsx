'use client';

import Avatar from '@/components/Avatar';
import ChannelBadge from '@/components/ChannelBadge';
import ChannelContextBadge from '@/components/ChannelContextBadge';
import AIReplyBox from '@/components/AIReplyBox';
import { getRelativeTime } from '@/lib/mockData';
import { ConversationGroup } from './types';
import ReplyToolbar from './ReplyToolbar';

interface ConversationDetailProps {
  group: ConversationGroup;
}

export default function ConversationDetail({ group }: ConversationDetailProps) {
  return (
    <>
      {/* Header */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="flex items-start gap-4">
          <Avatar src={group.senderAvatar} name={group.senderName} size="lg" online={group.senderOnline} />
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-gray-900">{group.senderName}</h2>
                  <ChannelBadge channel={group.channel} size="md" />
                  {group.messages.length > 1 && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {group.messages.length} messages
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{getRelativeTime(group.latestTimestamp)}</p>
              </div>
              {group.topicLabel && (
                <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${group.topicColor || 'bg-gray-100 text-gray-600'}`}>
                  {group.topicLabel}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-1.5 w-28 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 w-[85%] rounded-full" />
              </div>
              <span className="text-xs text-gray-400">85% relationship</span>
            </div>
            {group.channelContext && !group.channelContext.isDM && (
              <div className="mt-3">
                <ChannelContextBadge channel={group.channel} context={group.channelContext} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {group.messages.map((msg, idx) => (
          <div key={msg.id || idx} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
            <div className="flex items-start gap-3 mb-2">
              <Avatar src={msg.sender.avatar} name={msg.sender.name} size="sm" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{msg.sender.name}</p>
                  <p className="text-xs text-gray-400">{getRelativeTime(msg.timestamp)}</p>
                </div>
                {msg.subject && <p className="text-xs text-gray-500 font-medium mt-0.5">{msg.subject}</p>}
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{msg.preview}</p>
            {msg.topicLabel && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium mt-2 ${msg.topicColor || 'bg-gray-100 text-gray-600'}`}>
                {msg.topicLabel}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* AI Reply Box */}
      {group.hasAIDraft && (() => {
        const draftMsg = group.messages.find(m => m.hasAIDraft && m.aiDraft);
        return draftMsg?.aiDraft ? (
          <div className="px-6 pt-4 bg-white border-t border-gray-100">
            <AIReplyBox
              suggestedReply={draftMsg.aiDraft}
              onSend={(text) => alert(`Reply sent: "${text.substring(0, 50)}..." (Demo mode)`)}
            />
          </div>
        ) : null;
      })()}

      {/* Reply input */}
      <ReplyToolbar recipientName={group.senderName} />
    </>
  );
}
