from prometheus_client import Counter, Histogram, Gauge, generate_latest, REGISTRY
from fastapi import Request, Response
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
import time

# ---------------- Metric Definitions ----------------

REQUEST_COUNT = Counter(
    "auth_http_requests_total",
    "Total number of HTTP requests to the Auth Service",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "auth_http_request_duration_seconds",
    "HTTP request latency in seconds for the Auth Service",
    ["method", "endpoint"]
)

ACTIVE_USERS = Gauge(
    "auth_active_users",
    "Number of registered users (approximated)"
)

CONTACTS_CREATED = Counter(
    "auth_contacts_created_total",
    "Total number of emergency contacts added"
)

HANDSHAKE_RESULT = Counter(
    "auth_handshake_results_total",
    "Handshake responses by result",
    ["action"]
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


def inc_active_users():
    ACTIVE_USERS.inc()

def dec_active_users():     # pragma: no cover
    ACTIVE_USERS.dec()

def inc_contacts_created():
    CONTACTS_CREATED.inc()

def record_handshake(action: str):
    HANDSHAKE_RESULT.labels(action=action).inc() # pragma: no cover


async def metrics_endpoint(request: Request):
    return Response(content=generate_latest(REGISTRY), media_type="text/plain")