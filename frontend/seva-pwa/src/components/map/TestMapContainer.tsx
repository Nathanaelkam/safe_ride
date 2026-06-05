'use client';
import { useEffect, useRef, useState } from 'react';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

interface TestMapContainerProps {
  destination: Destination;
  height?: string;
}

export function TestMapContainer({ destination, height = '300px' }: TestMapContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerInfo, setContainerInfo] = useState<string>('Initializing...');

  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerInfo(`Container: ${rect.width}x${rect.height}px`);
      console.log('Container dimensions:', rect);
    }
  }, []);

  return (
    <div
      className="relative rounded-2xl overflow-hidden border border-cream/10 dark:border-cream/10 light:border-ink/10"
      style={{ height }}
    >
      <div 
        ref={containerRef} 
        className="w-full h-full bg-gradient-to-br from-terracotta/20 to-ochre/20 flex items-center justify-center"
      >
        <div className="text-center p-6">
          <h3 className="font-display text-lg mb-2 text-cream dark:text-cream light:text-ink">
            Map Test Container
          </h3>
          <p className="text-sm text-cream/75 dark:text-cream/75 light:text-ink/75 mb-3">
            Destination: {destination.label}
          </p>
          <p className="text-xs text-cream/55 dark:text-cream/55 light:text-ink/55 mb-2">
            Coordinates: {destination.lat}, {destination.lng}
          </p>
          <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
            {containerInfo}
          </p>
          
          {/* Visual route representation */}
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="w-3 h-3 rounded-full bg-terracotta"></div>
            <div className="w-16 h-px bg-gradient-to-r from-terracotta to-ochre"></div>
            <div className="w-3 h-3 rounded-full bg-ochre"></div>
          </div>
          <p className="text-xs text-cream/45 dark:text-cream/45 light:text-ink/45 mt-2">
            Current → {destination.label}
          </p>
        </div>
      </div>
    </div>
  );
}