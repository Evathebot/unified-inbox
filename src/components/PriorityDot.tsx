interface PriorityDotProps {
  priority: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriorityDot({ priority, size = 'md' }: PriorityDotProps) {
  const getColor = (priority: number) => {
    if (priority >= 80) return 'bg-red-500';
    if (priority >= 60) return 'bg-orange-500';
    if (priority >= 40) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const isPulsing = priority >= 80;

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3'
  };

  return (
    <div
      className={`
        ${getColor(priority)}
        ${sizeClasses[size]}
        rounded-full
        ${isPulsing ? 'animate-pulse' : ''}
      `}
      title={`Priority: ${priority}`}
    />
  );
}
