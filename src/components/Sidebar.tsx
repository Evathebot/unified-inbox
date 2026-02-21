'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Inbox, Users, Calendar, Sun, Settings } from 'lucide-react';
import GlassCard from './GlassCard';

const navItems = [
  { icon: Inbox, label: 'Inbox', href: '/' },
  { icon: Users, label: 'Contacts', href: '/contacts' },
  { icon: Calendar, label: 'Calendar', href: '/calendar' },
  { icon: Sun, label: 'Briefing', href: '/briefing' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <GlassCard className="h-screen p-6 flex flex-col gap-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">AI Inbox</h1>
        <p className="text-sm text-gray-400 mt-1">Unified Communications</p>
      </div>

      <nav className="flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl
                  transition-all duration-200
                  ${isActive 
                    ? 'bg-white/[0.12] text-white border border-white/[0.15]' 
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }
                `}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
              A
            </div>
            <div>
              <p className="text-white font-medium text-sm">Alex</p>
              <p className="text-gray-400 text-xs">alex@company.com</p>
            </div>
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
