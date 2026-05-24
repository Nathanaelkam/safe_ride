"""
Emergency Trigger Service — application factory (emergency_main.py)

This file is intentionally thin. It:
  1. Wires the FastAPI lifespan (Redis connection) from redis_client.py
  2. Registers the two routers from the routers/ package

All business logic, schemas, metrics, and Redis plumbing live in
their own dedicated modules:

  app/
  ├── config.py        — pydantic-settings configuration
  ├── schemas.py       — Pydantic request / response models
  ├── metrics.py       — Prometheus counter definitions
  ├── redis_client.py  — Redis lifecycle + publish_sos_event()
  └── routers/
      ├── health.py    — GET /health, GET /metrics
      └── emergency.py — POST /emergency/panic, POST /emergency/voice

Event-bus contract:
  Stream key : seva:events:sos_triggered
  Fields     : { user_id, trip_id, source, latitude, longitude, timestamp }
"""

import logging

from fastapi import FastAPI

from .redis_client import lifespan
from .routers import health, emergency

logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Seva Emergency Trigger Service",
    version="1.0.0",
    description=(
        "Handles manual panic button presses and voice-activated SOS triggers. "
        "Publishes SOS_TRIGGERED events to the Redis event bus for downstream "
        "consumption by the Notification Service."
    ),
    lifespan=lifespan,
)

app.include_router(health.router)
app.include_router(emergency.router)
