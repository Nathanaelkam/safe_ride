# Route Analysis Service

The Route Analysis Service is a background stream-processing microservice responsible for real-time geospatial tracking and anomaly detection. 

## Overview

The service consumes live GPS coordinate pings from active trips. It evaluates these coordinates against the expected route geometry using Haversine formulas and bearing calculations to compute Cross-Track Error (XTE). If a driver deviates significantly from the planned path, the service emits an anomaly event.

## Geospatial Mathematics

* **Haversine Formula**: Calculates the great-circle distance between two points on the Earth's surface.
* **Bearing**: Calculates the initial trajectory angle between points.
* **Cross-Track Distance**: Determines the shortest perpendicular distance from a live GPS point to the mathematical line segment representing the intended route. Errors greater than `50.0` meters flag an `OFF_ROUTE_DEVIATION` anomaly.

## Endpoints

* **GET `/metrics`**: Exposes Prometheus-compatible metrics.
* **GET `/health`**: Returns operational status.

## Event Architecture

* **Subscribes**: Consumes live GPS coordinate streams.
* **Publishes**: Emits `anomaly.detected` payloads (including passenger ID, latitude, longitude, and confidence score) to Redis, triggering downstream consumers like the Notification Service.

## Observability & Metrics

Prometheus metrics exposed at `/metrics`:
* `route_analysis_gps_checks_total`
* `route_analysis_anomaly_detections_total`
* `route_analysis_malformed_gps_events_total`
* `route_analysis_anomaly_published_total`

## Local Development

Run locally using `uvicorn`:
```bash
uvicorn main:app --reload --port 8003
```
