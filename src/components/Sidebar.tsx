'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Inbox, Mail, MessageCircle, Send, Hash, Users, Calendar, Sun, Settings } from 'lucide-react';

const platformIcons = [
  { icon: Inbox, href: '/', color: 'text-gray-700', hoverBg: 'hover:bg-gray-100', label: 'Inbox' },
  { icon: Mail, href: '/?channel=gmail', color: 'text-red-500', hoverBg: 'hover:bg-red-50', label: 'Gmail' },
  { icon: MessageCircle, href: '/?channel=whatsapp', color: 'text-green-500', hoverBg: 'hover:bg-green-50', label: 'WhatsApp' },
  { icon: Send, href: '/?channel=telegram', color: 'text-blue-500', hoverBg: 'hover:bg-blue-50', label: 'Telegram' },
  { icon: Hash, href: '/?channel=slack', color: 'text-purple-700', hoverBg: 'hover:bg-purple-50', label: 'Slack' },
];

const bottomNav = [
  { icon: Inbox, href: '/', label: 'Inbox' },
  { icon: Mail, href: '/briefing', label: 'Briefing' },
  { icon: Users, href: '/contacts', label: 'Contacts' },
  { icon: Settings, href: '/settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="h-screen w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4">
      {/* Platform icons */}
      <div className="flex flex-col items-center gap-1 flex-1">
        {platformIcons.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href === '/' && pathname === '/');

          return (
            <Link key={item.label} href={item.href} title={item.label}>
              <div
                className={`
                  w-10 h-10 rounded-xl flex items-center justify-center
                  transition-all duration-150
                  ${isActive 
                    ? `${item.color} bg-gray-100` 
                    : `text-gray-400 ${item.hoverBg} hover:text-gray-600`
                  }
                `}
              >
                <Icon size={20} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex flex-col items-center gap-1 pb-2">
        {bottomNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} title={item.label}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150">
                <Icon size={18} />
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
