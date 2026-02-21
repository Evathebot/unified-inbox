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
  iconColor = 'text-purple-400' 
}: BriefingCardProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`${iconColor}`}>
          <Icon size={24} />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
      </div>
      <div>{children}</div>
    </GlassCard>
  );
}
