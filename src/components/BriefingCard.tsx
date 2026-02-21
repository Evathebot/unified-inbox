import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import GlassCard from './GlassCard';

interface BriefingCardProps {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
  iconColor?: string;
}

export default function BriefingCard({ 
  title, 
  icon: Icon, 
  children, 
  iconColor = 'text-orange-500' 
}: BriefingCardProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${iconColor}`}>
          <Icon size={22} />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {title.toLowerCase().includes('ai') && (
          <span className="ai-badge text-[9px] font-bold text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI</span>
        )}
      </div>
      <div>{children}</div>
    </GlassCard>
  );
}
