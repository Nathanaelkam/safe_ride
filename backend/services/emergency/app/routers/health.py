"""
Health & Observability router for the Emergency Trigger Service.

Endpoints:
  GET /health   — liveness probe for K8s / Docker Compose
  GET /metrics  — Prometheus scrape target
"""

from fastapi import APIRouter
from fastapi.responses import PlainTextResponse
from prometheus_client import generate_latest, CONTENT_TYPE_LATEST

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Liveness probe for container orchestration (K8s / Docker Compose)."""
    return {"status": "ok", "service": "emergency"}


@router.get("/metrics", response_class=PlainTextResponse, tags=["observability"])
async def metrics():
    """Prometheus-compatible metrics endpoint scraped by the observability stack."""
    return PlainTextResponse(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
