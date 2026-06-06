# Seva – Backend Architecture & Usage Guide

## 1. Overview
Seva is a real‑time emergency transit tracking system. The backend is a set of **independent microservices** orchestrated by a single Docker Compose network. They communicate exclusively through **Redis** (Pub/Sub and Streams), never directly. Each service that needs persistent data owns its own **PostgreSQL database** (Database‑per‑Service pattern).

## 2. Microservices

| Service | Port | Database | Redis usage | Responsibilities |
|---------|------|----------|-------------|-----------------|
| **Auth** | 8001 | `auth_db` | None | User registration, JWT login, emergency contacts (CRUD + handshake). |
| **Tracking** | 8002 | `tracking_db` | **Stream producer** – writes `location_updates` | Start/complete trips, WebSocket endpoint for live GPS streaming. |
| **Emergency** | 8003 | None | **Pub/Sub publisher** – channel `emergency.sos` | Panic button & voice SOS ingestion, keyword detection. |
| **Route Analysis** | 8004 | None | **Stream consumer** – reads `location_updates` | Background worker that monitors GPS coordinates (placeholder for geofencing). |
| **Notification** | 8005 | None | **Pub/Sub subscriber** – channels `emergency.sos`, `anomaly.detected` | Listens for alerts, fetches accepted contacts from Auth REST API, sends mock SMS. |

All services expose `/health` and `/metrics` for Kubernetes liveness/readiness probes and Prometheus scraping.

## 3. Event‑Driven Communication

### 3.1 SOS Flow (Emergency → Notification)
- Mobile app sends a **panic** (`POST /emergency/panic`) or voice transcript (`POST /emergency/voice`).
- Emergency Service publishes an `SOS_TRIGGERED` event to Redis **Pub/Sub** channel `emergency.sos`.
- Notification Service, subscribed to the same channel, receives the event instantly.
- It calls `GET /contacts/user/{passenger_id}` on the Auth Service to retrieve **accepted** emergency contacts.
- For each contact, a (mock) SMS alert is dispatched with the passenger’s coordinates.

### 3.2 GPS Tracking Flow (Tracking → Route Analysis)
- Passenger starts a trip (`POST /trips/start`) → receives a `trip_id`.
- The mobile app opens a **WebSocket** to `ws://<host>:8002/ws/tracking/{trip_id}?token=<jwt>`.
- Every few seconds, it sends `{"latitude": …, "longitude": …, "timestamp": …}`.
- The Tracking Service validates the JWT, checks trip ownership, then pushes the data into a **Redis Stream** named `location_updates`.
- The Route Analysis Service runs an **async background task** that continuously reads from `location_updates` and logs each GPS point (geofencing/anomaly detection can be added here).
- If an anomaly is detected, it publishes to Pub/Sub `anomaly.detected`, which the Notification Service also listens to.

### 3.3 Contact Handshake
- Users add emergency contacts by phone number (`POST /contacts/`). Initially `PENDING`.
- The target contact must register, log in, and **accept** the request via `PUT /contacts/{id}/respond?action=ACCEPTED`.
- Only `ACCEPTED` contacts are visible to the internal `/contacts/user/{id}` endpoint used by Notification.

## 4. Authentication (JWT)
- Auth Service issues HS256 JWTs (`access_token`, `refresh_token`).
- Tracking Service verifies the JWT locally using the same secret (`TRACKING_SECRET_KEY` = `AUTH_SECRET_KEY`).
- No synchronous HTTP call to Auth is made during tracking; the token is trusted.
- Refresh tokens allow the mobile app to stay logged in for 30 days.

## 5. Database Isolation
- `auth_db`: `users`, `user_contacts`, `refresh_tokens`.
- `tracking_db`: `trips` (only a `passenger_id` string, no foreign key to `auth_db`).
- Emergency, Route Analysis, Notification are **stateless** – no database.

## 6. Running the System

### Prerequisites
- Docker & Docker Compose
- `make` (optional, for convenience)

### Start everything
```bash
cd backend
docker compose up --build -d