'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import PlatformLogo from './PlatformLogo';
import { Users, Calendar, Settings } from 'lucide-react';

const navItems = [
  { icon: 'inbox', href: '/', label: 'Inbox', isLucide: false },
  { icon: 'calendar', href: '/calendar', label: 'Calendar', isLucide: true, LucideIcon: Calendar },
  { icon: 'users', href: '/contacts', label: 'Contacts', isLucide: true, LucideIcon: Users },
  { icon: 'settings', href: '/settings', label: 'Settings', isLucide: true, LucideIcon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around py-2 px-4">
        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link key={item.label} href={item.href}>
              <div className={`flex flex-col items-center gap-0.5 px-3 py-1 ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                {item.isLucide && item.LucideIcon ? (
                  <item.LucideIcon size={20} />
                ) : (
                  <PlatformLogo platform={item.icon} size={20} />
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
