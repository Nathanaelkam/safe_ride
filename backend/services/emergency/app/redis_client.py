"""
Redis client lifecycle and SOS event publisher for the Emergency Trigger Service.

Responsibilities:
  - Manage a single async Redis connection pool (opened on startup, closed on shutdown).
  - Expose `publish_sos_event()` for routers to call without knowing Redis internals.
  - Degrade gracefully: if Redis is unavailable, log the event and return without raising
    so the mobile client always receives a timely HTTP response.
"""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from typing import Optional

import redis.asyncio as aioredis
from fastapi import FastAPI

from .config import settings
from .metrics import SOS_PUBLISHED_COUNTER

logger = logging.getLogger("emergency_service.redis")

# Module-level singleton — set by the lifespan context manager
_redis_client: Optional[aioredis.Redis] = None


# ---------------------------------------------------------------------------
# Lifespan context manager (wired into the FastAPI app)
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Open a single async Redis connection pool on startup; close on shutdown."""
    global _redis_client
    try:
        _redis_client = aioredis.from_url(
            settings.emergency_redis_url,
            encoding="utf-8",
            decode_responses=True,
        )
        await _redis_client.ping()
        logger.info("Redis connection established at %s", settings.emergency_redis_url)
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "Could not connect to Redis at startup (%s). "
            "SOS events will be logged only until Redis is available.",
            exc,
        )
        _redis_client = None

    yield  # ← application runs here

    if _redis_client:
        await _redis_client.aclose()
        logger.info("Redis connection closed.")


# ---------------------------------------------------------------------------
# Public helper used by routers
# ---------------------------------------------------------------------------
async def publish_sos_event(payload: dict) -> None:
    """Publish an SOS_TRIGGERED event to the configured Redis Stream.

    Falls back to structured logging if Redis is unavailable so the HTTP
    response is never blocked by a missing message broker (fault-tolerance
    requirement from context.md §5).
    """
    global _redis_client
    if _redis_client is None:
        logger.warning(
            "Redis unavailable – SOS_TRIGGERED event logged only: %s",
            json.dumps(payload),
        )
        return

    try:
        # Publish using Pub/Sub for the new Notification Service
        import json
        await _redis_client.publish("emergency.sos", json.dumps(payload))
        
        # Dual-publish to the original Stream just in case
        await _redis_client.xadd(settings.sos_stream_key, payload)
        
        SOS_PUBLISHED_COUNTER.inc()
        logger.info(
            "SOS_TRIGGERED published to stream '%s' and channel 'emergency.sos': %s",
            settings.sos_stream_key,
            payload,
        )
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to publish SOS event to Redis: %s", exc)
        # Do NOT raise — the mobile client must receive a 200 regardless of
        # broker availability (fault-tolerance design requirement).
