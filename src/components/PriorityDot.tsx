interface PriorityDotProps {
  priority: number;
  size?: 'sm' | 'md' | 'lg';
}

export default function PriorityDot({ priority, size = 'md' }: PriorityDotProps) {
  const getColor = () => {
    if (priority >= 80) return 'bg-red-500';
    if (priority >= 60) return 'bg-orange-400';
    if (priority >= 40) return 'bg-yellow-400';
    return 'bg-gray-300';
  };

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <div
      className={`${getColor()} ${sizeClasses[size]} rounded-full`}
      title={`Priority: ${priority}`}
    />
  );
}
