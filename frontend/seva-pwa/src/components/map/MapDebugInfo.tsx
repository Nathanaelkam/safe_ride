'use client';
import { useEffect, useState } from 'react';

export function MapDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const info = {
      hasMapboxToken: !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
      tokenLength: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.length || 0,
      tokenPreview: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN?.substring(0, 10) + '...',
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'Server',
      windowSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'Unknown',
      timestamp: new Date().toISOString()
    };
    setDebugInfo(info);
    console.log('Map Debug Info:', info);
  }, []);

  return (
    <div className="bg-ink/90 dark:bg-ink/90 light:bg-white/90 p-4 rounded-xl text-xs">
      <h3 className="font-display text-sm mb-3 text-terracotta">Map Debug Information</h3>
      <div className="space-y-1 text-cream/75 dark:text-cream/75 light:text-ink/75">
        <p>Has Token: {debugInfo.hasMapboxToken ? '✅ Yes' : '❌ No'}</p>
        <p>Token Length: {debugInfo.tokenLength}</p>
        {debugInfo.hasMapboxToken && <p>Token Preview: {debugInfo.tokenPreview}</p>}
        <p>Window Size: {debugInfo.windowSize}</p>
        <p>User Agent: {debugInfo.userAgent?.substring(0, 50)}...</p>
        <p>Timestamp: {debugInfo.timestamp}</p>
      </div>
    </div>
  );
}