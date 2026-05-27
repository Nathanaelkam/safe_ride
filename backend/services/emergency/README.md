# Emergency Service

The Emergency Service is a critical microservice in the Safe Ride system responsible for handling immediate distress signals from passengers.

## Overview

This service exposes REST API endpoints for clients (e.g., mobile apps) to trigger SOS alerts, panic buttons, or report critical incidents. Upon receiving an alert, the service handles initial validation and immediately publishes an event to the Redis event bus, ensuring low-latency handoff to subscribed systems (such as the Notification service).

## Endpoints

* **POST Base Emergency Triggers** (e.g. `/api/v1/emergency/sos`): Accepts SOS signals.
* **GET `/metrics`**: Exposes Prometheus-compatible metrics for observability.
* **GET `/health`**: Returns the operational status of the service.

## Event Publishing

* Dual publishes (Pub/Sub & Streams) to channels such as `emergency.sos` allowing both real-time notification listeners and persistent event logs to capture the incident.

## Observability & Metrics

Prometheus metrics are collected and exposed at `/metrics`:
* `PANIC_COUNTER`: Number of panic button taps.
* `VOICE_COUNTER`: Number of voice-activated distressed calls.
* `SOS_PUBLISHED_COUNTER`: Total SOS events successfully published to Redis.

## Local Development

Run locally using `uvicorn`:
```bash
uvicorn app.emergency_main:app --reload --port 8002
```
