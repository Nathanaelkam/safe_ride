from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from fastapi import Request, Response
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
import time

# ---------------- Metric Definitions ----------------

REQUEST_COUNT = Counter(
    "tracking_http_requests_total",
    "Total number of HTTP requests to the Tracking Service",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "tracking_http_request_duration_seconds",
    "HTTP request latency in seconds for the Tracking Service",
    ["method", "endpoint"]
)

ACTIVE_TRIPS = Gauge(
    "tracking_active_trips",
    "Number of currently active trips"
)

WEBSOCKET_MESSAGES = Counter(
    "tracking_websocket_messages_total",
    "Total number of GPS messages received via WebSocket"
)


class PrometheusMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        endpoint = request.url.path
        method = request.method
        status = response.status_code
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)
        return response


def inc_active_trips():
    ACTIVE_TRIPS.inc()

def dec_active_trips():
    ACTIVE_TRIPS.dec()

def inc_websocket_message():
    WEBSOCKET_MESSAGES.inc()


async def metrics_endpoint(request: Request):
    return Response(content=generate_latest(REGISTRY), media_type="text/plain")