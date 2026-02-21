import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export default function GlassCard({ children, className = '', hover = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        backdrop-blur-2xl bg-white/[0.06] border border-white/[0.08] 
        rounded-2xl shadow-2xl shadow-black/20
        ${hover ? 'transition-all duration-300 hover:bg-white/[0.09] hover:border-white/[0.12] hover:shadow-3xl hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
