'use client';
import Link from 'next/link';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/contexts/ThemeContext';

export function TopNavigation() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-ink/85 dark:bg-ink/85 light:bg-white/85 backdrop-blur-md">
      <div className="flex items-center justify-between px-5 lg:px-10 h-16">
        <div className="flex items-center gap-4 lg:gap-6">
          <Link href="/" className="font-display text-xl tracking-tight text-cream dark:text-cream light:text-ink">
            Seva
          </Link>
        </div>

        <div className="flex items-center gap-3 md:gap-5">
          <button 
            onClick={toggleTheme}
            className="text-cream/65 hover:text-cream dark:text-cream/65 dark:hover:text-cream light:text-ink/65 light:hover:text-ink transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
          </button>
          <div className="hidden md:block text-right">
            <p className="text-[10px] uppercase tracking-[0.22em] text-cream/45 dark:text-cream/45 light:text-ink/45">Watching over</p>
            <p className="text-sm tracking-wide text-cream dark:text-cream light:text-ink">{user?.fullName ?? 'You'}</p>
          </div>
          <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-terracotta to-ochre flex items-center justify-center font-display text-sm text-white">
            {(user?.fullName ?? 'You').charAt(0)}
          </div>
          <button 
            onClick={handleLogout}
            className="hidden md:block text-cream/65 hover:text-cream dark:text-cream/65 dark:hover:text-cream light:text-ink/65 light:hover:text-ink transition-colors"
            aria-label="Logout"
          >
            <LogOut size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

    </header>
  );
}
