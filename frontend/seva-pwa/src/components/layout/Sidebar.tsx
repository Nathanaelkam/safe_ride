'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MapPin, Clock, User, ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

const items = [
  { href: '/', label: 'Home', icon: Home, num: '01' },
  { href: '/trip', label: 'Active trip', icon: MapPin, num: '02' },
  { href: '/history', label: 'History', icon: Clock, num: '03' },
  { href: '/profile', label: 'Profile', icon: User, num: '04' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-cream/8 dark:border-cream/8 light:border-ink/8 bg-ink/70 dark:bg-ink/70 light:bg-gray-50/70 backdrop-blur-sm">
      <div className="px-7 pt-10 pb-12">
        <Link href="/" className="block">
          <p className="eyebrow mb-2">Seva</p>
          <p className="font-display text-3xl tracking-tight leading-none text-cream dark:text-cream light:text-ink">
            A circle<br /><span className="italic text-cream/65 dark:text-cream/65 light:text-ink/65">of three.</span>
          </p>
        </Link>
      </div>

      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== '/' && pathname.startsWith(it.href));
            const Icon = it.icon;
            return (
              <li key={it.href}>
                <Link
                  href={it.href}
                  className={cn(
                    'group relative flex items-center gap-4 rounded-xl px-4 py-3 transition-colors',
                    active ? 'bg-cream/5 text-cream dark:bg-cream/5 dark:text-cream light:bg-ink/5 light:text-ink' : 'text-cream/60 hover:text-cream hover:bg-cream/3 dark:text-cream/60 dark:hover:text-cream dark:hover:bg-cream/3 light:text-ink/60 light:hover:text-ink light:hover:bg-ink/3'
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[2px] bg-terracotta rounded-r-full" />
                  )}
                  <span className="numeral text-xs text-cream/35 dark:text-cream/35 light:text-ink/35 w-6">{it.num}</span>
                  <Icon size={16} strokeWidth={1.5} />
                  <span className="text-sm tracking-wide">{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="m-5 rounded-2xl border border-terracotta/30 bg-terracotta/8 p-5">
        <ShieldAlert size={18} className="text-terracotta mb-3" strokeWidth={1.5} />
        <p className="font-display text-base leading-snug mb-1 text-cream dark:text-cream light:text-ink">
          Three minutes is enough.
        </p>
        <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55 leading-relaxed">
          Add a second emergency contact to widen your watcher circle.
        </p>
      </div>
    </aside>
  );
}
