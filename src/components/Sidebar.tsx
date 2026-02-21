'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Users, Settings } from 'lucide-react';
import PlatformLogo from './PlatformLogo';

const platformIcons = [
  { platform: 'inbox', href: '/', label: 'All Inbox' },
  { platform: 'gmail', href: '/?channel=gmail', label: 'Gmail' },
  { platform: 'instagram', href: '/?channel=instagram', label: 'Instagram' },
  { platform: 'linkedin', href: '/?channel=linkedin', label: 'LinkedIn' },
  { platform: 'slack', href: '/?channel=slack', label: 'Slack' },
  { platform: 'whatsapp', href: '/?channel=whatsapp', label: 'WhatsApp' },
  { platform: 'telegram', href: '/?channel=telegram', label: 'Telegram' },
];

const bottomNav = [
  { icon: 'inbox', href: '/', label: 'Inbox', isLucide: false },
  { icon: 'users', href: '/contacts', label: 'Contacts', isLucide: true },
  { icon: 'settings', href: '/settings', label: 'Settings', isLucide: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-screen w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
      {/* Platform logos */}
      <div className="flex flex-col items-center gap-2 flex-1">
        {platformIcons.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : false;

          return (
            <Link key={item.label} href={item.href} title={item.label}>
              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-150
                  ${isActive 
                    ? 'bg-gray-100 shadow-sm' 
                    : 'hover:bg-gray-50'
                  }
                `}
              >
                <PlatformLogo platform={item.platform} size={22} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col items-center gap-1 pb-2">
        {bottomNav.map((item) => {
          if (item.isLucide) {
            const Icon = item.icon === 'users' ? Users : Settings;
            return (
              <Link key={item.label} href={item.href} title={item.label}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-150">
                  <Icon size={18} />
                </div>
              </Link>
            );
          }
          return (
            <Link key={item.label} href={item.href} title={item.label}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-gray-50 transition-all duration-150">
                <PlatformLogo platform={item.icon} size={18} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* User avatar */}
      <div className="mt-2">
        <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
          A
        </div>
      </div>
    </div>
  );
}
