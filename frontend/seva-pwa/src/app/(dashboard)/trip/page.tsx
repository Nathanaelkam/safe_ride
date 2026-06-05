'use client';
import { useEffect, useState } from 'react';
import { MapboxDirectTrackingMap } from '@/components/map/MapboxDirectTrackingMap';
import { SOSButton } from '@/components/emergency/SOSButton';
import { VoiceTrigger } from '@/components/emergency/VoiceTrigger';
import { DestinationSearch } from '@/components/trip/DestinationSearch';
import { TripConfirmation } from '@/components/trip/TripConfirmation';
import { StatusPill } from '@/components/common/StatusPill';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { useTripStore } from '@/store/tripStore';
import { api } from '@/services/api';
import type { Trip } from '@/types';
import { formatTripDuration, maskCoordinate } from '@/utils/format';

interface Destination {
  id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
}

export default function TripPage() {
  const {
    phase,
    activeTrip,
    plannedDestination,
    sosActive,
    setPhase,
    setPlannedDestination,
    setActiveTrip,
    startTrip,
    triggerSOS,
    resolveSOS
  } = useTripStore();
  
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [notifiedCount, setNotifiedCount] = useState<number | null>(null);

  useEffect(() => {
    // Check if there's an active trip from API
    api.fetchActiveTrip().then((t) => {
      if (t) {
        setTrip(t);
        setActiveTrip(t);
        setPhase('active');
      } else {
        setPhase('planning');
      }
      setLoading(false);
    });
  }, [setActiveTrip, setPhase]);

  const handleDestinationSelect = (destination: Destination) => {
    setPlannedDestination(destination);
  };

  const handleStartTrip = () => {
    if (plannedDestination) {
      // Create a mock trip for demonstration
      const mockTrip: Trip = {
        id: `trip-${Date.now()}`,
        status: 'active',
        startedAt: Date.now(),
        origin: { label: 'Current Location', lat: 3.8667, lng: 11.5167 },
        destination: { 
          label: plannedDestination.label, 
          lat: plannedDestination.lat, 
          lng: plannedDestination.lng 
        },
        waypoints: [{
          lat: 3.8667,
          lng: 11.5167,
          timestamp: Date.now(),
          label: 'Start'
        }]
      };
      
      setTrip(mockTrip);
      setActiveTrip(mockTrip);
      startTrip();
    }
  };

  const handleBackToSearch = () => {
    setPlannedDestination(null);
  };

  async function handleSOS() {
    if (!trip) return;
    setSosModalOpen(true);
    triggerSOS();
    const res = await api.triggerSOS(trip.id);
    setNotifiedCount(res.notified);
  }

  if (loading) {
    return <div className="text-cream/55 dark:text-cream/55 light:text-ink/55 text-sm">Loading your trip…</div>;
  }

  // Planning phase: Show destination search
  if (phase === 'planning' && !plannedDestination) {
    return <DestinationSearch onDestinationSelect={handleDestinationSelect} />;
  }

  // Planning phase: Show trip confirmation after destination selected
  if (phase === 'planning' && plannedDestination) {
    return (
      <TripConfirmation 
        destination={plannedDestination}
        onStartTrip={handleStartTrip}
        onBack={handleBackToSearch}
      />
    );
  }

  // Active phase: Show active trip (existing functionality)
  if (phase === 'active' && !trip) {
    return (
      <div className="text-center py-24">
        <p className="eyebrow mb-4">Quiet</p>
        <h1 className="font-display text-display-md tracking-tight mb-3">
          No trip is <span className="italic">live</span> right now.
        </h1>
        <p className="text-cream/55 dark:text-cream/55 light:text-ink/55">Your next ride will appear here the moment it begins.</p>
      </div>
    );
  }

  if (!trip) {
    return null;
  }

  const driver = trip.driver!;
  const current = trip.waypoints[trip.waypoints.length - 1];

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Header strip — editorial */}
      <header className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3">Trip in motion</p>
          <h1 className="font-display text-display-md tracking-tight">
            {trip.origin.label}<br/>
            <span className="text-cream/40 dark:text-cream/40 light:text-ink/40 italic">to </span>
            <span className="text-cream/85 dark:text-cream/85 light:text-ink/85">{trip.destination.label}</span>
          </h1>
        </div>
        <div className="lg:col-span-5 lg:text-right space-y-2">
          <p className="font-mono text-xs text-cream/45 dark:text-cream/45 light:text-ink/45">
            {maskCoordinate(current.lat)}° N · {maskCoordinate(current.lng)}° E
          </p>
        </div>
      </header>

      {/* Map */}
      <MapboxDirectTrackingMap
        waypoints={trip.waypoints}
        origin={trip.origin}
        destination={trip.destination}
        height="400px"
      />

      {/* SOS */}
      <div className="flex justify-center">
        <Card className="w-full max-w-md !p-6 md:!p-7 !border-0 flex flex-col items-center justify-center">
          <p className="eyebrow mb-1">If anything feels off</p>
          <p className="font-display text-lg md:text-xl tracking-tight mb-6 text-center">
            One press. <span className="italic">Three watchers.</span>
          </p>
          <SOSButton onTrigger={handleSOS} />
        </Card>
      </div>

      {/* Voice trigger strip */}
      <section>
        <p className="eyebrow mb-3">Hands-free protection</p>
        <VoiceTrigger codeword="lavender" onMatch={handleSOS} />
      </section>

      {/* SOS confirmation modal */}
      <Modal open={sosModalOpen} onClose={() => setSosModalOpen(false)} title="Your circle is reached">
        <p className="eyebrow mb-3">SOS dispatched</p>
        <p className="text-cream/75 mb-5 leading-relaxed">
          {notifiedCount != null
            ? `${notifiedCount} watcher${notifiedCount === 1 ? '' : 's'} ${notifiedCount === 1 ? 'has' : 'have'} been alerted with your live location, route, and driver details. Stay calm — they are on it.`
            : 'Notifying your circle…'}
        </p>
        <div className="hairline mb-5" />
        <p className="text-sm text-cream/55 mb-5">
          Your trip is being recorded. Local authorities can be looped in from the menu below if you want them involved.
        </p>
        <button
          className="btn-primary w-full"
          onClick={() => setSosModalOpen(false)}
        >
          I'm okay for now
        </button>
      </Modal>
    </div>
  );
}
