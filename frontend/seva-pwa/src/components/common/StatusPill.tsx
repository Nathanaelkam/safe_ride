import { cn } from '@/utils/cn';

type Tone = 'safe' | 'active' | 'alert' | 'neutral';

interface StatusPillProps {
  tone?: Tone;
  children: React.ReactNode;
  pulse?: boolean;
}

export function StatusPill({ tone = 'neutral', children, pulse }: StatusPillProps) {
  const tones: Record<Tone, string> = {
    safe: 'border-sage/40 text-sage',
    active: 'border-ochre/50 text-ochre',
    alert: 'border-terracotta/60 text-terracotta-400',
    neutral: 'border-cream/20 text-cream/70',
  };
  const dotTones: Record<Tone, string> = {
    safe: 'bg-sage',
    active: 'bg-ochre',
    alert: 'bg-terracotta',
    neutral: 'bg-cream/40',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]',
        tones[tone]
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone], pulse && 'animate-pulse')} />
      {children}
    </span>
  );
}
