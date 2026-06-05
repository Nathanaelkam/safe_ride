'use client';
import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, id, name, ...rest },
  ref
) {
  const inputId = id ?? name;
  return (
    <div className="block">
      <label htmlFor={inputId} className="block text-xs uppercase tracking-[0.18em] text-cream/55 mb-2">
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        name={name}
        className={cn('input', error && 'border-terracotta-400', className)}
        {...rest}
      />
      {error ? (
        <p className="mt-2 text-xs text-terracotta-400">{error}</p>
      ) : hint ? (
        <p className="mt-2 text-xs text-cream/40">{hint}</p>
      ) : null}
    </div>
  );
});
