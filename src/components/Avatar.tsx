'use client';

import { useState } from 'react';
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

/** Convert mxc:// or localmxc:// → proxied thumbnail URL (auth added server-side) */
function convertMxcUrl(mxc: string): string {
  // localmxc:// is Beeper's local variant — same Matrix server structure as mxc://
  const scheme = mxc.startsWith('localmxc://') ? 'localmxc://' : 'mxc://';
  const withoutScheme = mxc.slice(scheme.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx === -1) return '';
  const server = withoutScheme.slice(0, slashIdx);
  const mediaId = withoutScheme.slice(slashIdx + 1);
  // Local Beeper bridge media (localmxc://local-*) can't be served via the public
  // Matrix API, so skip the proxy and let the caller fall through to initials.
  if (server.startsWith('local-')) return '';
  const matrixUrl = `https://matrix.beeper.com/_matrix/media/v3/thumbnail/${server}/${mediaId}?width=96&height=96&method=crop`;
  return `/api/media/proxy?url=${encodeURIComponent(matrixUrl)}`;
}

function resolveImageSrc(src: string): string | null {
  if (!src) return null;
  if (src.startsWith('mxc://') || src.startsWith('localmxc://')) {
    const url = convertMxcUrl(src);
    return url || null; // empty string → local bridge media → show initials
  }
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src;
  // file:// paths and emoji/plain strings — not a loadable URL; show initials
  return null;
}

function isEmoji(str: string) {
  // Must be non-empty, ≤2 codepoints, and not the generic person placeholder
  return str.length > 0 && str !== '👤' && [...str].length <= 2 && str.length <= 4;
}

/** Generate up to 2 letter initials from a name, handling phone numbers gracefully */
function getInitials(name: string): string {
  if (!name) return '?';
  // Phone numbers — show generic icon char
  if (/^[\+\d]/.test(name) && /^[\+\d\s\-\(\)\.]+$/.test(name)) return '#';
  // Strip parenthetical suffixes like "(bot)", "(work)", etc. before splitting
  const cleaned = name.replace(/\s*\([^)]*\)/g, '').trim();
  const parts = (cleaned || name).trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
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
  const [imgError, setImgError] = useState(false);
  const badgeSize = channelBadgeSizes[size];

  const showImage = !!imageSrc && !imgError;
  // Use an emoji src as the avatar character only when it's a real non-person emoji.
  // Empty strings and the generic 👤 placeholder always fall through to initials.
  const fallbackChar = src && isEmoji(src) ? src : getInitials(name);

  return (
    <div className="relative shrink-0">
      {showImage && (
        <img
          src={imageSrc}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover bg-gray-200`}
          onError={() => setImgError(true)}
        />
      )}
      {!showImage && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gray-300 flex items-center justify-center text-gray-700 font-semibold select-none`}
        >
          {fallbackChar}
        </div>
      )}

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
