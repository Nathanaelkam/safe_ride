'use client';
import { useEffect, useState } from 'react';
import { MapboxDirectTrackingMap } from '@/components/map/MapboxDirectTrackingMap';
import { SOSButton } from '@/components/emergency/SOSButton';
import { VoiceTrigger } from '@/components/emergency/VoiceTrigger';
import { DestinationSearch } from '@/components/trip/DestinationSearch';
import { TripConfirmation } from '@/components/trip/TripConfirmation';
import { useTripTracking } from '@/hooks/useTripTracking';
import { StatusPill } from '@/components/common/StatusPill';
import { Card } from '@/components/common/Card';
import { Modal } from '@/components/common/Modal';
import { useTripStore } from '@/store/tripStore';
import { useAuthStore } from '@/store/authStore';
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
    isLoading: storeLoading,
    error: storeError,
    setPhase,
    setPlannedDestination,
    setActiveTrip,
    endTrip,
    triggerSOS,
    resolveSOS
  } = useTripStore();
  
  const { user, token, isAuthenticated, _hasHydrated } = useAuthStore();
  const tracking = useTripTracking();
  const [loading, setLoading] = useState(true);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [notifiedCount, setNotifiedCount] = useState<number | null>(null);
  const [lastVoiceCall, setLastVoiceCall] = useState<number>(0);

  useEffect(() => {
    console.log('=== AUTH STATE DEBUG ===');
    console.log('user:', user);
    console.log('token:', token);
    console.log('isAuthenticated:', isAuthenticated);
    console.log('_hasHydrated:', _hasHydrated);
    console.log('Auth store state:', useAuthStore.getState());
    
    // Check what's in localStorage
    console.log('=== LOCALSTORAGE DEBUG ===');
    const authStorage = localStorage.getItem('auth-storage');
    console.log('Raw auth storage:', authStorage);
    if (authStorage) {
      try {
        const parsed = JSON.parse(authStorage);
        console.log('Parsed auth storage:', parsed);
      } catch (e) {
        console.error('Failed to parse auth storage:', e);
      }
    }
    
    // Wait for hydration to complete before proceeding
    if (!_hasHydrated) {
      console.log('Waiting for auth store hydration...');
      return;
    }
    
    // Check if there's an active trip from API
    api.fetchActiveTrip().then((t) => {
      if (t) {
        setActiveTrip(t);
        setPhase('active');
      } else {
        setPhase('planning');
      }
      setLoading(false);
    });
  }, [setActiveTrip, setPhase, user, token, isAuthenticated, _hasHydrated]);

  const handleDestinationSelect = (destination: Destination) => {
    setPlannedDestination(destination);
  };

  // Trip starting is now handled by TripConfirmation component
  // which calls useTripStore.startTrip() directly

  const handleBackToSearch = () => {
    setPlannedDestination(null);
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip || !user) return;
    
    try {
      setLoading(true);
      await endTrip();
      // Store handles all the state updates
    } catch (err: any) {
      console.error('Failed to complete trip:', err);
    } finally {
      setLoading(false);
    }
  };

  async function handleSOS() {
    if (!activeTrip) {
      console.log('SOS not triggered - missing activeTrip');
      console.log('activeTrip:', activeTrip);
      return;
    }
    
    if (!user) {
      console.log('SOS not triggered - missing user');
      console.log('user:', user);
      console.log('token:', token);
      
      // Extract user ID from token if user object is null
      if (token) {
        console.log('=== EXTRACTING USER FROM TOKEN FOR SOS ===');
        try {
          // Decode JWT token to extract user ID from "sub" claim
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userIdFromToken = payload.sub;
          console.log('Extracted user ID from token:', userIdFromToken);
          
          const tokenUser = { 
            id: userIdFromToken, 
            phone_number: 'unknown', 
            full_name: 'User from Token' 
          };
          console.log('Using token user for SOS:', tokenUser);
          
          // Continue with token user instead of returning
          await performSOS(tokenUser, activeTrip);
          return;
        } catch (err) {
          console.error('Failed to decode token for SOS:', err);
          // Use fallback only if token decode fails
          const fallbackUserId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
          const fallbackUser = { id: fallbackUserId, phone_number: 'unknown', full_name: 'Fallback User' };
          console.log('Using fallback user for SOS:', fallbackUser);
          await performSOS(fallbackUser, activeTrip);
          return;
        }
      }
      
      return;
    }
    
    await performSOS(user, activeTrip);
  }
  
  async function performSOS(userObj: any, trip: any) {
    console.log('=== SOS BUTTON PRESSED ===');
    console.log('User ID:', userObj.id);
    console.log('Active Trip:', trip);
    console.log('Current Position:', tracking.currentPosition);
    
    setSosModalOpen(true);
    triggerSOS();
    
    try {
      // Ensure API has current token
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        throw new Error('No authentication token available');
      }
      api.setToken(currentToken);
      
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      // Use current GPS position from tracking if available
      if (tracking.currentPosition) {
        latitude = tracking.currentPosition.latitude;
        longitude = tracking.currentPosition.longitude;
        console.log('Using tracking position for SOS:', latitude, longitude);
      } else {
        // Fallback to requesting current position
        console.log('No tracking position, requesting GPS...');
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve, 
              reject,
              { timeout: 5000, enableHighAccuracy: true }
            );
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          console.log('Got GPS position for SOS:', latitude, longitude);
        } catch (gpsError) {
          console.warn('Could not get GPS position for SOS:', gpsError);
          // Continue without location
        }
      }
      
      // Call SOS API with or without location
      const res = await api.triggerSOS(userObj.id, trip.id, latitude, longitude);
      
      console.log('SOS API response:', res);
      
      if (res.status === 'accepted') {
        setNotifiedCount(3); // Default notification count
      } else {
        setNotifiedCount(0);
      }
    } catch (error) {
      console.error('SOS API call failed:', error);
      setNotifiedCount(0);
    }
  }

  async function handleVoiceSOS(transcript: string) {
    console.log('=== VOICE SOS FUNCTION CALLED ===');
    console.log('Transcript received:', transcript);
    console.log('activeTrip exists:', !!activeTrip);
    console.log('user exists:', !!user);
    
    if (!activeTrip) {
      console.log('Voice SOS not triggered - missing activeTrip');
      return;
    }
    
    let userObj = user;
    if (!user) {
      console.log('Voice SOS - missing user, extracting from token');
      if (token) {
        try {
          // Decode JWT token to extract user ID from "sub" claim
          const payload = JSON.parse(atob(token.split('.')[1]));
          const userIdFromToken = payload.sub;
          console.log('Voice SOS - extracted user ID from token:', userIdFromToken);
          
          userObj = { 
            id: userIdFromToken, 
            phone_number: 'unknown', 
            full_name: 'User from Token' 
          };
          console.log('Voice SOS using token user:', userObj);
        } catch (err) {
          console.error('Voice SOS - failed to decode token:', err);
          // Use fallback only if token decode fails
          const fallbackUserId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
          userObj = { id: fallbackUserId, phone_number: 'unknown', full_name: 'Fallback User' };
          console.log('Voice SOS using fallback user:', userObj);
        }
      } else {
        console.log('Voice SOS not triggered - no user or token');
        return;
      }
    }
    
    // Throttle voice API calls to prevent spam (minimum 2 seconds between calls)
    const now = Date.now();
    if (now - lastVoiceCall < 2000) {
      console.log('Voice API call throttled');
      return;
    }
    setLastVoiceCall(now);
    
    console.log('=== VOICE SOS PROCEEDING ===');
    console.log('User ID:', userObj.id);
    console.log('Trip ID:', activeTrip.id);
    console.log('Transcript:', transcript);
    
    try {
      // Ensure API has current token
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) {
        throw new Error('No authentication token available');
      }
      api.setToken(currentToken);
      
      let latitude: number | undefined;
      let longitude: number | undefined;
      
      // Use current GPS position from tracking if available
      if (tracking.currentPosition) {
        latitude = tracking.currentPosition.latitude;
        longitude = tracking.currentPosition.longitude;
        console.log('Using tracking position for Voice SOS:', latitude, longitude);
      }
      
      // Call Voice SOS API
      const res = await api.triggerVoiceSOS({
        user_id: userObj.id,
        transcript: transcript,
        trip_id: activeTrip.id,
        latitude,
        longitude
      });
      
      console.log('Voice SOS API response:', res);
      
      if (res.status === 'accepted') {
        // Voice trigger detected, show SOS modal
        console.log('Voice trigger phrase detected by backend!');
        setSosModalOpen(true);
        triggerSOS();
        setNotifiedCount(3);
      } else {
        console.log('Voice trigger not detected in transcript');
        // Voice trigger not detected, don't show modal
      }
    } catch (error) {
      console.error('Voice SOS API call failed:', error);
    }
  }

  if (loading || storeLoading || !_hasHydrated) {
    return <div className="text-cream/55 dark:text-cream/55 light:text-ink/55 text-sm">Loading your trip…</div>;
  }

  // Show error if trip creation failed
  if (storeError) {
    return (
      <div className="text-center py-24">
        <p className="eyebrow mb-4 text-terracotta">Error</p>
        <h1 className="font-display text-display-md tracking-tight mb-3">
          Something went <span className="italic">wrong</span>.
        </h1>
        <p className="text-cream/55 dark:text-cream/55 light:text-ink/55 mb-6">{storeError}</p>
        <button 
          onClick={() => {
            setPlannedDestination(null);
            setPhase('planning');
          }}
          className="btn-secondary"
        >
          Try again
        </button>
      </div>
    );
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
        onStartTrip={() => {}} // Component handles trip start internally
        onBack={handleBackToSearch}
      />
    );
  }

  // Active phase: Show active trip
  if (phase === 'active' && !activeTrip) {
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

  if (!activeTrip) {
    return null;
  }

  const driver = activeTrip.driver;
  const current = activeTrip.waypoints[activeTrip.waypoints.length - 1] || {
    lat: 0, lng: 0, timestamp: Date.now()
  };

  return (
    <div className="space-y-6 md:space-y-10">
      {/* Header strip — editorial */}
      <header className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        <div className="lg:col-span-7">
          <p className="eyebrow mb-3">Trip in motion</p>
          <h1 className="font-display text-display-md tracking-tight">
            {activeTrip.origin.label}<br/>
            <span className="text-cream/40 dark:text-cream/40 light:text-ink/40 italic">to </span>
            <span className="text-cream/85 dark:text-cream/85 light:text-ink/85">{activeTrip.destination.label}</span>
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
        waypoints={activeTrip.waypoints}
        origin={activeTrip.origin}
        destination={activeTrip.destination}
        height="400px"
        useRealTimeTracking={true}
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
        <VoiceTrigger 
          codeword="help" 
          onMatch={handleSOS}
          onTranscript={handleVoiceSOS}
        />
      </section>

      {/* Trip completion */}
      <section>
        <p className="eyebrow mb-3">Trip Management</p>
        <Card className="!p-6">
          <p className="font-display text-lg tracking-tight mb-4">
            Arrived at your destination?
          </p>
          <button
            onClick={handleCompleteTrip}
            disabled={loading}
            className="btn-secondary w-full mb-4"
          >
            {loading ? 'Completing Trip...' : 'Complete Trip'}
          </button>
          
          {/* Debug buttons */}
          <div className="space-y-2 border-t pt-4 border-cream/10">
            <p className="text-xs text-cream/45 mb-2">Debug Emergency APIs:</p>
            <button
              onClick={() => {
                console.log('Testing manual SOS API call...');
                console.log('Debug - user:', user);
                console.log('Debug - activeTrip:', activeTrip);
                
                // Extract actual user ID from token
                let testUserId = user?.id;
                if (!testUserId) {
                  const token = useAuthStore.getState().token;
                  if (token) {
                    try {
                      const payload = JSON.parse(atob(token.split('.')[1]));
                      testUserId = payload.sub;
                      console.log('Debug SOS - extracted user ID from token:', testUserId);
                    } catch (err) {
                      console.error('Debug SOS - failed to decode token:', err);
                      testUserId = 'test-user-fallback';
                    }
                  } else {
                    testUserId = 'test-user-no-token';
                  }
                }
                
                const testTripId = activeTrip?.id || 'test-trip-id';
                const token = useAuthStore.getState().token;
                
                console.log('Using testUserId:', testUserId);
                console.log('Using testTripId:', testTripId);
                console.log('Using token:', token);
                
                api.setToken(token || '');
                api.triggerSOS(testUserId, testTripId, 3.848, 11.502)
                  .then(res => console.log('Manual SOS result:', res))
                  .catch(err => console.error('Manual SOS error:', err));
              }}
              className="btn-secondary w-full text-sm"
            >
              Test SOS API
            </button>
            <button
              onClick={() => {
                console.log('Testing manual Voice API call...');
                console.log('Debug - user:', user);
                console.log('Debug - activeTrip:', activeTrip);
                
                // Extract actual user ID from token
                let testUserId = user?.id;
                if (!testUserId) {
                  const token = useAuthStore.getState().token;
                  if (token) {
                    try {
                      const payload = JSON.parse(atob(token.split('.')[1]));
                      testUserId = payload.sub;
                      console.log('Debug Voice - extracted user ID from token:', testUserId);
                    } catch (err) {
                      console.error('Debug Voice - failed to decode token:', err);
                      testUserId = 'test-user-fallback';
                    }
                  } else {
                    testUserId = 'test-user-no-token';
                  }
                }
                
                const testTripId = activeTrip?.id || 'test-trip-id';
                const token = useAuthStore.getState().token;
                
                console.log('Using testUserId:', testUserId);
                console.log('Using testTripId:', testTripId);
                console.log('Using token:', token);
                
                api.setToken(token || '');
                api.triggerVoiceSOS({
                  user_id: testUserId,
                  transcript: 'I need help please',
                  trip_id: testTripId,
                  latitude: 3.848,
                  longitude: 11.502
                })
                  .then(res => console.log('Manual Voice result:', res))
                  .catch(err => console.error('Manual Voice error:', err));
              }}
              className="btn-secondary w-full text-sm"
            >
              Test Voice API
            </button>
          </div>
        </Card>
      </section>

      {/* SOS confirmation modal */}
      <Modal open={sosModalOpen} onClose={() => setSosModalOpen(false)} title="Your circle is reached">
        <p className="eyebrow mb-3">SOS dispatched</p>
        <p className="text-cream/75 mb-5 leading-relaxed">
          {notifiedCount != null && notifiedCount > 0
            ? `Your emergency contacts have been alerted with your live location and trip details. They will receive immediate notifications about your situation.`
            : notifiedCount === 0 
              ? `We encountered an issue sending alerts. Your location and trip details are being recorded for safety.`
              : 'Sending emergency notifications to your contacts…'}
        </p>
        <div className="hairline mb-5" />
        <p className="text-sm text-cream/55 mb-5">
          Your live location is being shared with your emergency contacts. They can track your movement in real-time until you mark yourself as safe.
        </p>
        <button
          className="btn-primary w-full"
          onClick={() => {
            setSosModalOpen(false);
            resolveSOS();
          }}
        >
          I'm safe now
        </button>
      </Modal>
    </div>
  );
}
