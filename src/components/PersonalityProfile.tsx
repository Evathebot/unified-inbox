import { Brain, MessageSquare, Target, Globe, Clock, Lightbulb } from 'lucide-react';
import GlassCard from './GlassCard';
import { Contact } from '@/lib/mockData';

interface PersonalityProfileProps {
  personality: Contact['personality'];
}

export default function PersonalityProfile({ personality }: PersonalityProfileProps) {
  const traits = [
    { icon: MessageSquare, label: 'Communication Style', value: personality.communicationStyle },
    { icon: Target, label: 'Decision Making', value: personality.decisionMaking },
    { icon: Globe, label: 'Languages', value: personality.preferredLanguage },
    { icon: Clock, label: 'Best Time to Reach', value: personality.bestTimeToReach },
  ];

  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="text-orange-500" size={24} />
        <h2 className="text-xl font-bold text-gray-900">AI Personality Insights</h2>
      </div>

      <div className="space-y-4">
        {traits.map((trait) => {
          const Icon = trait.icon;
          return (
            <div key={trait.label} className="space-y-1">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Icon size={14} />
                <span>{trait.label}</span>
              </div>
              <p className="text-gray-900 text-sm pl-6">{trait.value}</p>
            </div>
          );
        })}

        {/* Interests — only rendered when there are actual values */}
        {personality.interests && personality.interests.length > 0 && (
          <div className="space-y-1 pt-2">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Lightbulb size={14} />
              <span>Key Interests</span>
            </div>
            <div className="flex flex-wrap gap-2 pl-6">
              {personality.interests.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-xs font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  );
}
