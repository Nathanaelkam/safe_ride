import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0E0C0A',
          700: '#1A1714',
          600: '#2A2520',
        },
        cream: {
          DEFAULT: '#F5EFE6',
          200: '#EFE6D7',
        },
        terracotta: {
          DEFAULT: '#E2725B',
          400: '#EB8A75',
          600: '#C75A45',
        },
        sage: { DEFAULT: '#6B8E6B' },
        ochre: { DEFAULT: '#D4A574' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      fontSize: {
        'display-xl': ['clamp(3.5rem, 8vw, 6.5rem)', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'display-lg': ['clamp(2.75rem, 5.5vw, 4.25rem)', { lineHeight: '1.0', letterSpacing: '-0.035em' }],
        'display-md': ['clamp(2rem, 3.6vw, 2.75rem)', { lineHeight: '1.1', letterSpacing: '-0.03em' }],
      },
      animation: {
        'reveal-up': 'revealUp 700ms cubic-bezier(0.2, 0.6, 0.2, 1) both',
        'pulse-ring': 'pulseRing 2.4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'breathe': 'breathe 4s ease-in-out infinite',
      },
      keyframes: {
        revealUp: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.92)', opacity: '0.9' },
          '70%': { transform: 'scale(1.45)', opacity: '0' },
          '100%': { transform: 'scale(1.45)', opacity: '0' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
