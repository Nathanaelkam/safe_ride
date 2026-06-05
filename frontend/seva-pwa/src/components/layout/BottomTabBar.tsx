'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, Clock, User } from 'lucide-react';
import { cn } from '@/utils/cn';

const tabs = [
  { href: '/trip', label: 'Trip', icon: MapPin },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/profile', label: 'Profile', icon: User },
];

export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="mx-4 mb-4">
          <div className="bg-ink/95 dark:bg-ink/95 light:bg-white/95 backdrop-blur-xl rounded-3xl border border-cream/10 dark:border-cream/10 light:border-ink/10 shadow-2xl">
          <div className="flex items-center justify-around px-2 py-3">
            {tabs.map((tab) => {
              const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href));
              const Icon = tab.icon;
              
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-200',
                    active 
                      ? 'bg-terracotta/15 text-terracotta' 
                      : 'text-cream/60 dark:text-cream/60 light:text-ink/60 hover:text-cream dark:hover:text-cream light:hover:text-ink'
                  )}
                >
                  <Icon size={20} strokeWidth={1.5} />
                  <span className="text-xs font-medium tracking-wide">{tab.label}</span>
                </Link>
              );
            })}
          </div>
          </div>
        </div>
      </nav>
  );
}