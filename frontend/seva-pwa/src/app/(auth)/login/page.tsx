'use client';
import Link from 'next/link';
import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/trip');
    }
  }, [isAuthenticated, router]);

  // Allow access to login page for testing - remove in production
  if (isAuthenticated) {
    return (
      <div className="animate-reveal-up">
        <p className="eyebrow mb-4">Already signed in</p>
        <h1 className="font-display text-display-md tracking-tight mb-3">
          You're already <span className="italic">signed in</span>!
        </h1>
        <p className="text-cream/55 dark:text-cream/55 light:text-ink/55 mb-10">
          You can continue to your dashboard or sign out to test login.
        </p>
        <button 
          onClick={() => {
            const { logout } = useAuthStore.getState();
            logout();
            window.location.reload();
          }}
          className="btn-secondary w-full"
        >
          Sign Out (for testing)
        </button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(phoneNumber, password);
      router.push('/trip');
    } catch (err: any) {
      setError(err?.message || 'Could not sign you in. Check your details and try again.');
      console.error('Login error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-reveal-up">
      <p className="eyebrow mb-4">Welcome back</p>
      <h1 className="font-display text-display-md tracking-tight mb-3">
        Step <span className="italic">in</span>, your circle is waiting.
      </h1>
      <p className="text-cream/55 dark:text-cream/55 light:text-ink/55 mb-10">
        Sign in to continue watching over the people you ride for.
      </p>

      <form onSubmit={handleSubmit} className="space-y-7">
        <Input
          label="Phone Number"
          name="phoneNumber"
          type="tel"
          autoComplete="tel"
          required
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+237 6xx xxx xxx"
        />
        <Input
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="text-sm text-terracotta-400">{error}</p>}

        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
          {!submitting && <ArrowRight size={16} />}
        </Button>
      </form>

      <div className="mt-10 hairline" />
      <p className="mt-6 text-sm text-cream/55 dark:text-cream/55 light:text-ink/55">
        New to Seva?{' '}
        <Link href="/register" className="text-cream dark:text-cream light:text-ink underline underline-offset-4 decoration-terracotta">
          Create an account
        </Link>
      </p>
    </div>
  );
}
