'use client';
import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated } = useAuthStore();

  console.log('AuthGuard - hasHydrated:', _hasHydrated, 'isAuthenticated:', isAuthenticated);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      console.log('AuthGuard - Redirecting to login');
      router.push('/login');
    }
  }, [isAuthenticated, _hasHydrated, router]);

  // Don't render anything until hydration is complete
  if (!_hasHydrated) {
    console.log('AuthGuard - Not hydrated yet, showing nothing');
    return null;
  }

  if (!isAuthenticated) {
    console.log('AuthGuard - Not authenticated, showing nothing');
    return null;
  }

  console.log('AuthGuard - Authenticated, showing children');
  return <>{children}</>;
}