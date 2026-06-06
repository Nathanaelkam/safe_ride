'use client';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { api } from '@/services/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { registerInit, registerVerify, registrationStep } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    
    try {
      if (registrationStep === 'form') {
        // Step 1: Send OTP
        await registerInit({
          full_name: fullName,
          phone_number: phoneNumber,
          password: password,
          email: email
        });
      } else if (registrationStep === 'otp') {
        // Step 2: Verify OTP and complete registration
        await registerVerify(otp);
        router.push('/trip');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please try again.');
      console.error('Registration error:', err);
    } finally {
      setSubmitting(false);
    }
  }

  if (registrationStep === 'otp') {
    return (
      <div className="animate-reveal-up">
        <p className="eyebrow mb-4">Verify</p>
        <h1 className="font-display text-display-md tracking-tight mb-3">
          Check your <span className="italic">email</span>.
        </h1>
        <p className="text-cream/55 mb-10">
          We sent a verification code to <strong>{email}</strong>. Enter it below to complete your registration.
        </p>

        <form onSubmit={handleSubmit} className="space-y-7">
          <Input
            label="Verification code"
            name="otp"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            maxLength={6}
          />

          {error && <p className="text-sm text-terracotta-400">{error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={submitting}>
            {submitting ? 'Verifying…' : 'Verify & Complete Registration'}
            {!submitting && <ArrowRight size={16} />}
          </Button>
        </form>

        <div className="mt-10 hairline" />
        <p className="mt-6 text-sm text-cream/55">
          Didn't receive the code?{' '}
          <button 
            onClick={() => window.location.reload()} 
            className="text-cream underline underline-offset-4 decoration-terracotta"
          >
            Try again
          </button>
        </p>
      </div>
    );
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
          {submitting ? 'Sending code…' : 'Send verification code'}
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
