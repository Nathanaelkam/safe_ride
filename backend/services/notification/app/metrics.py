"""
Prometheus metrics registry for the Notification Service.

All Counter/Gauge/Histogram objects are defined here so they can be
imported by both the subscriber and the /metrics endpoint without
risk of duplicate-registration errors.
"""

from prometheus_client import Counter

NOTIFICATION_EVENTS_RECEIVED_TOTAL = Counter(
    "notification_events_received_total",
    "Total number of notification events received from Redis",
)

CONTACT_FETCH_ATTEMPTS_TOTAL = Counter(
    "notification_contact_fetch_attempts_total",
    "Total number of emergency contact fetch attempts from the Auth service",
)

CONTACT_FETCH_ERRORS_TOTAL = Counter(
    "notification_contact_fetch_errors_total",
    "Total number of emergency contact fetch failures",
)

ALERTS_DISPATCHED_TOTAL = Counter(
    "notification_alerts_dispatched_total",
    "Total number of outgoing alert deliveries",
)

ALERTS_SKIPPED_NO_CONTACT_TOTAL = Counter(
    "notification_alerts_skipped_no_contact_total",
    "Total number of notification events skipped because no contacts were found",
)
