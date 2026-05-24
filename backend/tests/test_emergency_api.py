"""
Test suite for the Emergency Trigger Service (modular layout).

All tests are database-free. Redis is fully mocked via unittest.mock so
the suite runs cleanly in the Jenkins CI environment without any
infrastructure dependencies.

Coverage targets:
  - GET  /health
  - GET  /metrics
  - POST /emergency/panic        (normal + missing body fields)
  - POST /emergency/voice        (trigger detected + no trigger + edge cases)
  - Redis publish failure path   (graceful degradation)
"""

import pytest
import pytest_asyncio
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient, ASGITransport

from services.emergency.app.emergency_main import app
from services.emergency.app.redis_client import publish_sos_event


# ---------------------------------------------------------------------------
# Shared HTTPX async client fixture (no DB, no Redis needed)
# ---------------------------------------------------------------------------
@pytest_asyncio.fixture
async def client():
    """Provide an in-process HTTPX client wired to the emergency FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ===========================================================================
# Health & Observability
# ===========================================================================
@pytest.mark.asyncio
async def test_health_check(client):
    """GET /health must return 200 with the correct JSON body."""
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "emergency"


@pytest.mark.asyncio
async def test_metrics_endpoint(client):
    """GET /metrics must return 200 and Prometheus-formatted plain text."""
    resp = await client.get("/metrics")
    assert resp.status_code == 200
    assert "text/plain" in resp.headers["content-type"]
    assert "emergency_panic_total" in resp.text


# ===========================================================================
# POST /emergency/panic
# ===========================================================================
@pytest.mark.asyncio
async def test_panic_returns_200(client):
    """A well-formed panic request must be accepted with status 200."""
    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        new_callable=AsyncMock,
    ) as mock_publish:
        resp = await client.post(
            "/emergency/panic",
            json={
                "user_id": "user-uuid-001",
                "trip_id": "trip-uuid-001",
                "latitude": 48.8566,
                "longitude": 2.3522,
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "accepted"
    assert body["event"] == "SOS_TRIGGERED"
    mock_publish.assert_awaited_once()


@pytest.mark.asyncio
async def test_panic_without_optional_fields(client):
    """Panic endpoint must accept a payload with only the required user_id."""
    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        new_callable=AsyncMock,
    ):
        resp = await client.post(
            "/emergency/panic",
            json={"user_id": "user-uuid-002"},
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"


@pytest.mark.asyncio
async def test_panic_missing_user_id_returns_422(client):
    """Missing required 'user_id' must cause a 422 Unprocessable Entity response."""
    resp = await client.post(
        "/emergency/panic",
        json={"latitude": 48.8566, "longitude": 2.3522},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_panic_publishes_correct_source(client):
    """The event published on panic must have source='PANIC_BUTTON'."""
    captured_payload: dict = {}

    async def capture(payload: dict):
        captured_payload.update(payload)

    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        side_effect=capture,
    ):
        await client.post(
            "/emergency/panic",
            json={"user_id": "user-uuid-003"},
        )

    assert captured_payload.get("source") == "PANIC_BUTTON"
    assert captured_payload.get("user_id") == "user-uuid-003"


# ===========================================================================
# POST /emergency/voice
# ===========================================================================
@pytest.mark.asyncio
async def test_voice_sos_trigger_detected(client):
    """A transcript containing a known trigger phrase must fire SOS_TRIGGERED."""
    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        new_callable=AsyncMock,
    ) as mock_publish:
        resp = await client.post(
            "/emergency/voice",
            json={
                "user_id": "user-uuid-010",
                "transcript": "Please help me I am in danger!",
                "latitude": 51.5074,
                "longitude": -0.1278,
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "accepted"
    assert body["event"] == "SOS_TRIGGERED"
    mock_publish.assert_awaited_once()


@pytest.mark.asyncio
async def test_voice_sos_no_trigger_ignored(client):
    """A transcript with no trigger phrase must return status='ignored'."""
    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        new_callable=AsyncMock,
    ) as mock_publish:
        resp = await client.post(
            "/emergency/voice",
            json={
                "user_id": "user-uuid-011",
                "transcript": "The weather is lovely today.",
            },
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ignored"
    mock_publish.assert_not_awaited()


@pytest.mark.asyncio
async def test_voice_sos_case_insensitive(client):
    """Trigger phrase detection must be case-insensitive."""
    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        new_callable=AsyncMock,
    ) as mock_publish:
        resp = await client.post(
            "/emergency/voice",
            json={
                "user_id": "user-uuid-012",
                "transcript": "HELP! SOMEBODY HELP ME!",
            },
        )

    assert resp.status_code == 200
    assert resp.json()["status"] == "accepted"
    mock_publish.assert_awaited_once()


@pytest.mark.asyncio
async def test_voice_sos_publishes_correct_source(client):
    """The event published on voice SOS must have source='VOICE_SOS'."""
    captured_payload: dict = {}

    async def capture(payload: dict):
        captured_payload.update(payload)

    with patch(
        "services.emergency.app.routers.emergency.publish_sos_event",
        side_effect=capture,
    ):
        await client.post(
            "/emergency/voice",
            json={"user_id": "user-uuid-013", "transcript": "sos"},
        )

    assert captured_payload.get("source") == "VOICE_SOS"
    assert "transcript" in captured_payload


@pytest.mark.asyncio
async def test_voice_sos_missing_transcript_returns_422(client):
    """Missing required 'transcript' field must return 422."""
    resp = await client.post(
        "/emergency/voice",
        json={"user_id": "user-uuid-014"},
    )
    assert resp.status_code == 422


# ===========================================================================
# Redis graceful degradation (tests redis_client module directly)
# ===========================================================================
@pytest.mark.asyncio
async def test_publish_sos_event_when_redis_none():
    """
    When _redis_client is None, publish_sos_event must log and return
    without raising — ensuring the mobile client always gets a response.
    """
    import services.emergency.app.redis_client as module

    original = module._redis_client
    module._redis_client = None
    try:
        # Must not raise
        await publish_sos_event({"user_id": "u1", "source": "PANIC_BUTTON"})
    finally:
        module._redis_client = original


@pytest.mark.asyncio
async def test_publish_sos_redis_xadd_failure_is_caught():
    """
    If xadd raises an exception, publish_sos_event must log and swallow it.
    The caller should never receive an unhandled exception from a broker error.
    """
    import services.emergency.app.redis_client as module

    mock_redis = AsyncMock()
    mock_redis.xadd = AsyncMock(side_effect=Exception("xadd failed"))
    original = module._redis_client
    module._redis_client = mock_redis

    try:
        # Must not raise
        await publish_sos_event({"user_id": "u2", "source": "VOICE_SOS"})
    finally:
        module._redis_client = original
