'use client';

import { useState } from 'react';
import PlatformLogo from './PlatformLogo';

interface GroupAvatarProps {
  memberAvatars: string[];
  memberNames: string[];
  size?: 'sm' | 'md' | 'lg';
  channel?: string;
}

/** Convert mxc:// or localmxc:// → proxied thumbnail URL (auth added server-side) */
function convertMxcUrl(mxc: string): string {
  const scheme = mxc.startsWith('localmxc://') ? 'localmxc://' : 'mxc://';
  const withoutScheme = mxc.slice(scheme.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx === -1) return '';
  const server = withoutScheme.slice(0, slashIdx);
  const mediaId = withoutScheme.slice(slashIdx + 1);
  // Local Beeper bridge media can't be fetched via the public Matrix API — skip.
  if (server.startsWith('local-')) return '';
  const matrixUrl = `https://matrix.beeper.com/_matrix/media/v3/thumbnail/${server}/${mediaId}?width=48&height=48&method=crop`;
  return `/api/media/proxy?url=${encodeURIComponent(matrixUrl)}`;
}

function resolveImageSrc(src: string): string | null {
  if (!src) return null;
  if (src.startsWith('mxc://') || src.startsWith('localmxc://')) {
    const url = convertMxcUrl(src);
    return url || null;
  }
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) return src;
  return null;
}

function isEmoji(str: string) {
  return [...str].length <= 2 && str.length <= 4;
}

function getInitials(name: string): string {
  if (!name) return '?';
  if (/^[\+\d]/.test(name) && /^[\+\d\s\-\(\)\.]+$/.test(name)) return '#';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map(n => n[0]).join('').toUpperCase() || '?';
}

const containerSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

const channelBadgeSizes = {
  sm:  { container: 'w-3.5 h-3.5', logo: 8 },
  md:  { container: 'w-4 h-4',     logo: 10 },
  lg:  { container: 'w-5 h-5',     logo: 12 },
};

interface MiniAvatarProps {
  src: string;
  name: string;
}

function MiniAvatar({ src, name }: MiniAvatarProps) {
  const imageSrc = resolveImageSrc(src);
  const [imgError, setImgError] = useState(false);
  const showImage = !!imageSrc && !imgError;
  return (
    <div className="w-full h-full bg-gray-300 flex items-center justify-center text-[9px] font-semibold text-gray-700 overflow-hidden">
      {showImage ? (
        <img
          src={imageSrc}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span>{isEmoji(src) ? src : getInitials(name)}</span>
      )}
    </div>
  );
}

/**
 * Group conversation avatar showing a collage of member faces.
 *
 * Layout adapts to member count:
 * - **1 member** — single full circle (same as Avatar)
 * - **2 members** — side-by-side vertical split
 * - **3–4 members** — 2×2 grid (members beyond 4 are ignored)
 *
 * Each slot handles `mxc://` URIs (Beeper/Matrix media) and falls back to
 * initials or emoji if the image is missing or fails to load.
 *
 * Like Avatar, an optional `channel` prop renders a platform logo badge at
 * the bottom-right corner (consistent with the Beeper UI).
 *
 * @param memberAvatars - Ordered list of avatar URLs or emoji strings for each member
 * @param memberNames   - Display names in the same order (used for initials fallback)
 * @param size          - `'sm'` | `'md'` | `'lg'` (default `'md'`)
 * @param channel       - Platform key rendered as a badge icon at bottom-right
 */
export default function GroupAvatar({ memberAvatars, memberNames, size = 'md', channel }: GroupAvatarProps) {
  const badgeSize = channelBadgeSizes[size];

  // Take up to 4 members for the collage
  const slots = Array.from({ length: 4 }, (_, i) => ({
    src: memberAvatars[i] ?? '',
    name: memberNames[i] ?? '?',
  }));

  const count = Math.min(memberAvatars.length, 4);

  return (
    <div className={`relative shrink-0 ${containerSizes[size]}`}>
      {count <= 1 ? (
        // Single member or empty: show full avatar
        <div className="w-full h-full rounded-full overflow-hidden">
          <MiniAvatar src={slots[0].src} name={slots[0].name} />
        </div>
      ) : count === 2 ? (
        // 2 members: side-by-side split
        <div className="w-full h-full rounded-full overflow-hidden flex">
          <div className="w-1/2 h-full">
            <MiniAvatar src={slots[0].src} name={slots[0].name} />
          </div>
          <div className="w-1/2 h-full">
            <MiniAvatar src={slots[1].src} name={slots[1].name} />
          </div>
        </div>
      ) : (
        // 3-4 members: 2x2 grid
        <div className="w-full h-full rounded-full overflow-hidden grid grid-cols-2 gap-px bg-white">
          {slots.slice(0, 4).map((slot, i) => (
            <div key={i} className="overflow-hidden">
              <MiniAvatar src={slot.src} name={slot.name} />
            </div>
          ))}
        </div>
      )}

      {/* Channel badge — bottom-right */}
      {channel && (
        <div className={`absolute -bottom-0.5 -right-0.5 ${badgeSize.container} bg-white rounded-full border border-gray-200 flex items-center justify-center shadow-sm`}>
          <PlatformLogo platform={channel} size={badgeSize.logo} />
        </div>
      )}
    </div>
  );
}
