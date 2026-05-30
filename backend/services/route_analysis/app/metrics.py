"""
Prometheus metrics registry for the Route Analysis Service.

All Counter/Gauge/Histogram objects are defined here so they can be
imported by both the subscriber and the /metrics endpoint without
risk of duplicate-registration errors.
"""

from prometheus_client import Counter

GPS_CHECKS_TOTAL = Counter(
    "route_analysis_gps_checks_total",
    "Total number of GPS events processed by the route analysis service",
)

ANOMALY_DETECTIONS_TOTAL = Counter(
    "route_analysis_anomaly_detections_total",
    "Total number of route anomalies detected by the route analysis service",
)

MALFORMED_GPS_EVENTS_TOTAL = Counter(
    "route_analysis_malformed_gps_events_total",
    "Total number of malformed GPS messages that could not be processed",
)

ANOMALY_PUBLISHED_TOTAL = Counter(
    "route_analysis_anomaly_published_total",
    "Total number of anomaly events published to the Redis event bus",
)
