'use client';
import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/utils/cn';

interface VoiceTriggerProps {
  codeword: string;
  onMatch: () => void;
  onTranscript?: (transcript: string) => void;
  className?: string;
}

/**
 * Lightweight wrapper around the Web Speech API. When the user's voice
 * contains the codeword (case-insensitive), `onMatch` fires once.
 * Falls back gracefully when SpeechRecognition is unavailable.
 */
export function VoiceTrigger({ codeword, onMatch, onTranscript, className }: VoiceTriggerProps) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [lastHeard, setLastHeard] = useState<string>('');
  const recRef = useRef<any>(null);
  const firedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SR =
      // @ts-ignore
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (ev: any) => {
      const transcript = Array.from(ev.results)
        .map((r: any) => r[0].transcript)
        .join(' ');
      
      const cleanTranscript = transcript.toLowerCase();
      setLastHeard(cleanTranscript.slice(-40));
      
      // Send transcript to backend for processing if callback provided
      if (onTranscript && transcript.trim()) {
        console.log('VoiceTrigger: Sending transcript to backend:', transcript.trim());
        onTranscript(transcript.trim());
      }
      
      // Also keep local fallback check
      if (!firedRef.current && cleanTranscript.includes(codeword.toLowerCase())) {
        firedRef.current = true;
        onMatch();
        // cooldown so the same utterance doesn't refire
        setTimeout(() => { firedRef.current = false; }, 4000);
      }
    };

    rec.onerror = () => setListening(false);
    rec.onend = () => {
      if (listening) {
        try { rec.start(); } catch {}
      }
    };
    recRef.current = rec;

    return () => {
      try { rec.stop(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeword, onMatch, onTranscript]);

  const toggle = () => {
    if (!supported) return;
    const rec = recRef.current;
    if (!rec) return;
    if (listening) {
      try { rec.stop(); } catch {}
      setListening(false);
    } else {
      try {
        rec.start();
        setListening(true);
      } catch { setListening(false); }
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!supported}
      aria-pressed={listening}
      className={cn(
        'flex w-full items-center gap-4 rounded-2xl border border-cream/12 bg-ink-700/60 px-5 py-4 text-left transition-colors',
        listening && 'border-sage/50',
        !supported && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 items-center justify-center rounded-full border',
          listening ? 'border-sage text-sage animate-breathe' : 'border-cream/25 text-cream/70'
        )}
      >
        {listening ? <Mic size={18} /> : <MicOff size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-[0.22em] text-cream/55">
          {supported ? 'Voice codeword' : 'Voice unavailable'}
        </p>
        <p className="font-display text-lg tracking-tight truncate">
          "{codeword}"
        </p>
        {listening && lastHeard && (
          <p className="text-[10px] font-mono text-cream/35 truncate mt-1">heard: {lastHeard}</p>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-[0.22em] text-cream/45">
        {listening ? 'Listening' : 'Off'}
      </span>
    </button>
  );
}
