# Notification Service

The Notification Service acts as the primary event consumer for external alerts within the Safe Ride microservice architecture. It listens for actionable events (such as SOS signals and route anomalies) and dispatches external communications.

## Overview

The Notification service subscribes to Redis Pub/Sub channels to receive alerts from both the Emergency and Route Analysis services. When an event is received, it uses cross-service HTTP calls to retrieve the affected user's emergency contacts from the Auth service, and then prepares and sends an SMS containing critical location data.

## Endpoints

* **GET `/metrics`**: Exposes Prometheus-compatible metrics for observability.
* **GET `/health`**: Returns the operational status of the service.

## Event Subscriptions

* **`emergency.sos`**: Listens for user-initiated emergency triggers.
* **`anomaly.detected`**: Listens for systemic route deviation warnings.

## External Communication

* **Auth Service Integration**: Uses `httpx` to dynamically query the Auth Service REST API (`/contacts/user/{passenger_id}`) for emergency contact numbers.
* **SMS Gateway**: Integrates with Twilio (currently utilizing a mocked/log-based integration for MVP) to send customized alert messages including Google Maps links for exact GPS coordinates.

## Observability & Metrics

Prometheus metrics are collected and exposed at `/metrics`:
* `notification_events_received_total`
* `notification_contact_fetch_attempts_total`
* `notification_contact_fetch_errors_total`
* `notification_alerts_dispatched_total`
* `notification_alerts_skipped_no_contact_total`

## Local Development

Run locally using `uvicorn`:
```bash
uvicorn app.main:app --reload --port 8004
```
