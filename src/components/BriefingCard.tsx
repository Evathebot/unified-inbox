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
      </div>
      <div>{children}</div>
    </GlassCard>
  );
}
