'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { api } from '@/services/api';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.register({ fullName, email, phone: phoneNumber, password });
      router.push('/');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="animate-reveal-up">
      <p className="eyebrow mb-4">Begin</p>
      <h1 className="font-display text-display-md tracking-tight mb-3">
        A circle of <span className="italic">three</span>, a watcher of one.
      </h1>
      <p className="text-cream/55 mb-10">
        Your account holds the people you trust and the rides you take.
      </p>

      <form onSubmit={handleSubmit} className="space-y-7">
        <Input
          label="Full name"
          name="fullName"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Amara Nkeng"
        />
        <Input
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          label="Phone number"
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
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 8 characters."
        />

        {error && <p className="text-sm text-terracotta-400">{error}</p>}

        <Button type="submit" fullWidth size="lg" disabled={submitting}>
          {submitting ? 'Creating…' : 'Create my account'}
          {!submitting && <ArrowRight size={16} />}
        </Button>
      </form>

      <div className="mt-10 hairline" />
      <p className="mt-6 text-sm text-cream/55">
        Already have a Seva account?{' '}
        <Link href="/login" className="text-cream underline underline-offset-4 decoration-terracotta">
          Sign in
        </Link>
      </p>
    </div>
  );
}
