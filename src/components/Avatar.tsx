interface AvatarProps {
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-lg',
  lg: 'w-12 h-12 text-2xl',
  xl: 'w-20 h-20 text-4xl',
};

const dotSizes = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
  xl: 'w-4 h-4',
};

function isUrl(str: string) {
  return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('/');
}

function isEmoji(str: string) {
  return [...str].length <= 2 && str.length <= 4;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

export default function Avatar({ src, name, size = 'md', online }: AvatarProps) {
  const isImage = isUrl(src);

  return (
    <div className="relative shrink-0">
      {isImage ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover bg-gray-200`}
        />
      ) : (
        <div className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center text-gray-600`}>
          {isEmoji(src) ? src : getInitials(name)}
        </div>
      )}
      {online && (
        <div className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full border-2 border-white`}></div>
      )}
    </div>
  );
}
