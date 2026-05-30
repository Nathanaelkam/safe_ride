"""
Prometheus metrics registry for the Emergency Trigger Service.

All Counter/Gauge/Histogram objects are defined here so they can be
imported by both the routers and the /metrics endpoint without
risk of duplicate-registration errors.
"""

from prometheus_client import Counter

# Incremented on every POST /emergency/panic request received
PANIC_COUNTER = Counter(
    "emergency_panic_total",
    "Total number of manual panic button triggers received",
)

# Incremented on every POST /emergency/voice request received
VOICE_COUNTER = Counter(
    "emergency_voice_total",
    "Total number of voice SOS triggers received",
)

# Incremented only when an event is successfully written to the Redis Stream
SOS_PUBLISHED_COUNTER = Counter(
    "emergency_sos_published_total",
    "Total number of SOS_TRIGGERED events published to the Redis event bus",
)
