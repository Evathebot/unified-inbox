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
        bg-white border border-gray-100 
        rounded-xl shadow-sm
        ${hover ? 'transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
}
