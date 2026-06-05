'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SOSButtonProps {
  onTrigger: () => void;
  holdMs?: number;
  className?: string;
}

/**
 * Press-and-hold to confirm. Three concentric pulse rings telegraph urgency
 * without screaming red. Holding past `holdMs` fires `onTrigger` once.
 */
export function SOSButton({ onTrigger, holdMs = 1600, className }: SOSButtonProps) {
  const [pressing, setPressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const stop = useCallback(() => {
    setPressing(false);
    setProgress(0);
    startRef.current = null;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  const begin = useCallback(() => {
    if (firedRef.current) return;
    setPressing(true);
    startRef.current = performance.now();

    const tick = (t: number) => {
      if (startRef.current == null) return;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / holdMs);
      setProgress(p);
      if (p >= 1 && !firedRef.current) {
        firedRef.current = true;
        onTrigger();
        stop();
        // small cooldown
        setTimeout(() => { firedRef.current = false; }, 2500);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [holdMs, onTrigger, stop]);

  useEffect(() => () => stop(), [stop]);

  return (
    <div className={cn('flex flex-col items-center gap-4 select-none', className)}>
      <div className="relative">
        {/* Pulse rings */}
        <div className="pulse-stack absolute inset-[-22px] pointer-events-none">
          <span className="animate-pulse-ring" style={{ animationDelay: '0s' }} />
          <span className="animate-pulse-ring" style={{ animationDelay: '0.8s' }} />
          <span className="animate-pulse-ring" style={{ animationDelay: '1.6s' }} />
        </div>

        <button
          type="button"
          aria-label="Press and hold to trigger SOS"
          onPointerDown={begin}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          className={cn(
            'relative h-32 w-32 rounded-full bg-terracotta text-cream dark:text-cream light:text-cream font-display font-medium',
            'flex flex-col items-center justify-center gap-1 border-2 border-terracotta',
            'transition-transform duration-150 active:scale-95',
            pressing && 'scale-105'
          )}
        >
          <ShieldAlert size={26} strokeWidth={1.5} />
          <span className="text-xl tracking-tight">SOS</span>

          {/* Hold progress arc */}
          <svg
            className="absolute inset-0 -rotate-90 pointer-events-none"
            viewBox="0 0 100 100"
            aria-hidden
          >
            <circle
              cx="50"
              cy="50"
              r="47"
              fill="none"
              stroke="rgb(245 239 230 / 0.5)"
              strokeWidth="2"
              strokeDasharray={Math.PI * 2 * 47}
              strokeDashoffset={Math.PI * 2 * 47 * (1 - progress)}
              strokeLinecap="round"
              style={{ transition: pressing ? 'none' : 'stroke-dashoffset 200ms ease-out' }}
            />
          </svg>
        </button>
      </div>

      <p className="text-xs uppercase tracking-[0.22em] text-cream/55 dark:text-cream/55 light:text-ink/55">
        Press &amp; hold to alert your circle
      </p>
    </div>
  );
}
