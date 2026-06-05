'use client';
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Moon, Sun } from 'lucide-react';

export function ThemeTestCard() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Card className="max-w-md">
      <div className="space-y-4">
        <h3 className="font-display text-xl text-text-primary">
          Theme Test
        </h3>
        <p className="text-text-secondary text-sm">
          Current theme: <span className="font-medium text-text-primary">{theme}</span>
        </p>
        <p className="text-text-muted text-xs">
          This card demonstrates the theme switching functionality with proper colors.
        </p>
        
        <div className="space-y-2">
          <Button onClick={toggleTheme} className="gap-2">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
          </Button>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="h-8 bg-bg-primary rounded border border-border"></div>
            <div className="h-8 bg-bg-secondary rounded border border-border"></div>
          </div>
          
          <p className="text-xs text-text-muted">
            Background colors switch between dark/white themes
          </p>
        </div>
      </div>
    </Card>
  );
}