import pytest
from httpx import AsyncClient, ASGITransport
from services.route_analysis.app.route_analyzer import analyze_gps
from services.route_analysis.main import app

def test_analyze_gps_anomaly():
    """Test that EXACTLY 0.0 lat or lng flags an anomaly."""
    is_anomaly, anomaly_type, conf = analyze_gps(0.0, 45.1)
    assert is_anomaly is True
    assert anomaly_type == "OFF_ROUTE_DEVIATION"
    assert conf == 1.0

    is_anomaly, anomaly_type, conf = analyze_gps(-12.4, 0.0)
    assert is_anomaly is True
    assert anomaly_type == "OFF_ROUTE_DEVIATION"

def test_analyze_gps_normal():
    """Test that normal coordinates are OK."""
    is_anomaly, anomaly_type, conf = analyze_gps(40.7128, -74.0060)
    assert is_anomaly is False
    assert anomaly_type == "OK"
    assert conf == 0.0


@pytest.mark.asyncio
async def test_metrics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/metrics")

    assert resp.status_code == 200
    assert "route_analysis_gps_checks_total" in resp.text
