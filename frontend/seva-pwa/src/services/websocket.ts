import type { TripWaypoint } from '@/types';

const TRACKING_WS_BASE = process.env.NEXT_PUBLIC_TRACKING_SERVICE_WS_URL || 'ws://localhost:8002';

interface TrackingWebSocketConfig {
  tripId: string;
  accessToken: string;
  onLocationUpdate?: (waypoint: TripWaypoint) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class TrackingWebSocket {
  private ws: WebSocket | null = null;
  private config: TrackingWebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private isIntentionallyClosed = false;

  constructor(config: TrackingWebSocketConfig) {
    this.config = config;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    const wsUrl = `${TRACKING_WS_BASE}/ws/tracking/${this.config.tripId}?token=${this.config.accessToken}`;
    
    console.log('Attempting WebSocket connection to:', wsUrl);
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.config.onError?.(error as Event);
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected for trip tracking');
      this.reconnectAttempts = 0;
      this.config.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'ok') {
          // Acknowledgment from server
          return;
        }
        
        // Assume it's a location update
        if (data.latitude && data.longitude) {
          const waypoint: TripWaypoint = {
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
          };
          this.config.onLocationUpdate?.(waypoint);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.config.onDisconnect?.();
      
      if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.config.onError?.(error);
    };
  }

  private attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  sendLocation(latitude: number, longitude: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        latitude,
        longitude,
        timestamp: new Date().toISOString(),
      };
      
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send location:', error);
      }
    }
  }

  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

interface ViewerWebSocketConfig {
  tripId: string;
  shareToken: string;
  onLocationUpdate: (waypoint: TripWaypoint) => void;
  onError?: (error: Event) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export class ViewerWebSocket {
  private ws: WebSocket | null = null;
  private config: ViewerWebSocketConfig;

  constructor(config: ViewerWebSocketConfig) {
    this.config = config;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = `${TRACKING_WS_BASE}/ws/view/${this.config.tripId}?share_token=${this.config.shareToken}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to create viewer WebSocket connection:', error);
      this.config.onError?.(error as Event);
    }
  }

  private setupEventHandlers() {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Viewer WebSocket connected');
      this.config.onConnect?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.latitude && data.longitude) {
          const waypoint: TripWaypoint = {
            lat: data.latitude,
            lng: data.longitude,
            timestamp: data.timestamp ? new Date(data.timestamp).getTime() : Date.now(),
          };
          this.config.onLocationUpdate(waypoint);
        }
      } catch (error) {
        console.error('Failed to parse viewer WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('Viewer WebSocket disconnected');
      this.config.onDisconnect?.();
    };

    this.ws.onerror = (error) => {
      console.error('Viewer WebSocket error:', error);
      this.config.onError?.(error);
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}