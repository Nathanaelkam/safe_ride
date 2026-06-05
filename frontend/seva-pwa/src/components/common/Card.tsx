import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'inset';
}

export function Card({ children, className, variant = 'default', ...rest }: CardProps) {
  const variants = {
    default: 'bg-ink-700/60 border border-cream/8',
    outline: 'border border-cream/12 bg-transparent',
    inset: 'bg-ink-700 border border-cream/5',
  };
  return (
    <div className={cn('rounded-2xl p-6 backdrop-blur-sm', variants[variant], className)} {...rest}>
      {children}
    </div>
  );
}
