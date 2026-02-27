'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Users, Settings, Calendar, Newspaper } from 'lucide-react';
import PlatformLogo from './PlatformLogo';

const platformIcons = [
  { platform: 'inbox',     href: '/',                 label: 'All Inbox' },
  { platform: 'gmail',     href: '/?channel=gmail',   label: 'Gmail' },
  { platform: 'whatsapp',  href: '/?channel=whatsapp',label: 'WhatsApp' },
  { platform: 'telegram',  href: '/?channel=telegram', label: 'Telegram' },
  { platform: 'slack',     href: '/?channel=slack',   label: 'Slack' },
  { platform: 'instagram', href: '/?channel=instagram',label: 'Instagram' },
  { platform: 'linkedin',  href: '/?channel=linkedin', label: 'LinkedIn' },
];

export default function SidebarClient({ badgeCounts }: { badgeCounts: Record<string, number> }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const channelParam = searchParams.get('channel');

  const serverTotal = Object.values(badgeCounts).reduce((a, b) => a + b, 0);
  const [dynamicTotal, setDynamicTotal] = useState<number | null>(null);
  const [userInitial, setUserInitial] = useState('?');

  // Fetch current user for avatar
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (d.name) setUserInitial(d.name.charAt(0).toUpperCase()); })
      .catch(() => {});
  }, []);

  // Listen for unread count updates broadcast from the inbox
  useEffect(() => {
    const handler = (e: Event) => {
      const count = (e as CustomEvent<{ count: number }>).detail.count;
      setDynamicTotal(count);
    };
    window.addEventListener('inbox-unread-changed', handler);
    return () => window.removeEventListener('inbox-unread-changed', handler);
  }, []);

  const totalUnread = dynamicTotal ?? serverTotal;

  return (
    <div className="h-screen w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
      {/* Platform logos */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {platformIcons.filter(item =>
          item.platform === 'inbox' || (badgeCounts[item.platform] ?? 0) > 0
        ).map((item) => {
          const isActive =
            item.platform === 'inbox'
              ? pathname === '/' && !channelParam
              : channelParam === item.platform;

          const badge =
            item.platform === 'inbox'
              ? totalUnread
              : (badgeCounts[item.platform] ?? 0);

          return (
            <Link key={item.label} href={item.href} title={item.label}>
              <div
                className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                  isActive
                    ? 'bg-gray-100 shadow-sm ring-1 ring-gray-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <PlatformLogo platform={item.platform} size={22} />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col items-center gap-1 pb-2">
        <Link href="/briefing" title="Briefing">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${pathname === '/briefing' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <Newspaper size={18} />
          </div>
        </Link>
        <Link href="/calendar" title="Calendar">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${pathname === '/calendar' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <Calendar size={18} />
          </div>
        </Link>
        <Link href="/contacts" title="Contacts">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${pathname.startsWith('/contacts') ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <Users size={18} />
          </div>
        </Link>
        <Link href="/settings" title="Settings">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${pathname === '/settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <Settings size={18} />
          </div>
        </Link>
      </div>

      {/* User avatar */}
      <Link href="/settings" title="Settings">
        <div className="mt-2 w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm hover:ring-2 hover:ring-orange-300 transition-all">
          {userInitial}
        </div>
      </Link>
    </div>
  );
}
