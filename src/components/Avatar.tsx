'use client';

import PlatformLogo from './PlatformLogo';

interface AvatarProps {
  src: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  channel?: string;
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

// Channel badge sizes: container px, logo px
const channelBadgeSizes = {
  sm:  { container: 'w-3.5 h-3.5', logo: 8 },
  md:  { container: 'w-4 h-4',     logo: 10 },
  lg:  { container: 'w-5 h-5',     logo: 12 },
  xl:  { container: 'w-6 h-6',     logo: 14 },
};

/** Convert mxc://server/mediaId → proxied thumbnail URL (auth added server-side) */
function convertMxcUrl(mxc: string): string {
  const withoutScheme = mxc.slice('mxc://'.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx === -1) return '';
  const server = withoutScheme.slice(0, slashIdx);
  const mediaId = withoutScheme.slice(slashIdx + 1);
  const matrixUrl = `https://matrix.beeper.com/_matrix/media/v3/thumbnail/${server}/${mediaId}?width=96&height=96&method=crop`;
  return `/api/media/proxy?url=${encodeURIComponent(matrixUrl)}`;
}

function resolveImageSrc(src: string): string | null {
  if (src.startsWith('mxc://')) return convertMxcUrl(src);
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src;
  return null;
}

function isEmoji(str: string) {
  return [...str].length <= 2 && str.length <= 4;
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
}

/**
 * User avatar with optional online indicator and channel platform badge.
 *
 * Resolves the `src` in order of precedence:
 * 1. `mxc://` URIs → converted to a Beeper Matrix thumbnail URL
 * 2. `http(s)://` or root-relative paths → used as-is
 * 3. Everything else (emoji, initials string, empty) → renders initials/emoji fallback
 *
 * If the image fails to load, the component falls back to initials/emoji silently.
 * When `channel` is provided, a small platform logo badge appears at the bottom-right
 * corner of the avatar (as in Beeper), and the online dot moves to the top-right to
 * avoid overlap.
 *
 * @param src     - Avatar URL (`mxc://`, `https://`, `/path`) or emoji/name string for fallback
 * @param name    - Display name used for initials generation and `<img>` alt text
 * @param size    - Visual size: `'sm'` | `'md'` | `'lg'` | `'xl'` (default `'md'`)
 * @param online  - Show a green presence dot when true
 * @param channel - Platform key (`'slack'`, `'whatsapp'`, etc.) renders a badge icon
 */
export default function Avatar({ src, name, size = 'md', online, channel }: AvatarProps) {
  const imageSrc = resolveImageSrc(src);
  const badgeSize = channelBadgeSizes[size];

  return (
    <div className="relative shrink-0">
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover bg-gray-200`}
          onError={(e) => {
            // Fall back to initials on load error
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextSibling as HTMLElement | null)?.style?.setProperty('display', 'flex');
          }}
        />
      ) : null}
      <div
        className={`${sizeClasses[size]} rounded-full bg-gray-200 flex items-center justify-center text-gray-600 ${imageSrc ? 'hidden' : ''}`}
      >
        {isEmoji(src) ? src : getInitials(name)}
      </div>

      {/* Online dot — top-right when channel badge is present, bottom-right otherwise */}
      {online && !channel && (
        <div className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full border-2 border-white`}></div>
      )}
      {online && channel && (
        <div className={`absolute top-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full border-2 border-white`}></div>
      )}

      {/* Channel badge — bottom-right, like Beeper */}
      {channel && (
        <div className={`absolute -bottom-0.5 -right-0.5 ${badgeSize.container} bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm`}>
          <PlatformLogo platform={channel} size={badgeSize.logo} />
        </div>
      )}
    </div>
  );
}
