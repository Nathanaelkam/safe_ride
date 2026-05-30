import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch, MagicMock
from services.notification.app.main import app
from services.notification.app.subscribers.alert_listener import dispatch_alert, get_emergency_contacts

@pytest.mark.asyncio
async def test_get_emergency_contacts_success():
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"contacts": [{"name": "Dad", "phone_number": "+1234567890"}]}
        mock_get.return_value = mock_response

        contacts = await get_emergency_contacts("user123")
        assert len(contacts) == 1
        assert contacts[0]["phone_number"] == "+1234567890"

@pytest.mark.asyncio
async def test_dispatch_alert_sos():
    event = {
        "passenger_id": "user123",
        "lat": 40.7128,
        "lng": -74.0060
    }
    
    with patch("services.notification.app.subscribers.alert_listener.get_emergency_contacts", new_callable=AsyncMock) as mock_get_contacts:
        mock_get_contacts.return_value = [{"name": "Dad", "phone_number": "+1234567890"}]
        
        with patch("builtins.print") as mock_print:
            await dispatch_alert(event, "SOS")
            # Should print the alert with maps link
            mock_print.assert_any_call("[Notification] *** ALERT TO +1234567890: 🚨 SAFERIDE EMERGENCY: The passenger has triggered an SOS! Location: https://maps.google.com/?q=40.7128,-74.006 ***")

@pytest.mark.asyncio
async def test_dispatch_alert_anomaly():
    event = {
        "trip_id": "trip123", # Can fall back to trip_id
        "passenger_id": "user123",
        "lat": 40.7128,
        "lng": -74.0060,
        "confidence": 0.95
    }
    
    with patch("services.notification.app.subscribers.alert_listener.get_emergency_contacts", new_callable=AsyncMock) as mock_get_contacts:
        mock_get_contacts.return_value = [{"name": "Mom", "contact_phone": "+0987654321"}]
        
        with patch("builtins.print") as mock_print:
            await dispatch_alert(event, "ANOMALY")
            # Should print warning (95% confidence)
            mock_print.assert_any_call("[Notification] *** ALERT TO +0987654321: ⚠️ SAFERIDE WARNING: Unusual route detected (95% confidence). Location: https://maps.google.com/?q=40.7128,-74.006 ***")

@pytest.mark.asyncio
async def test_no_contacts_returns_gracefully():
    event = {
        "passenger_id": "user123"
    }
    
    with patch("services.notification.app.subscribers.alert_listener.get_emergency_contacts", new_callable=AsyncMock) as mock_get_contacts:
        mock_get_contacts.return_value = []
        
        with patch("builtins.print") as mock_print:
            await dispatch_alert(event, "SOS")
            mock_print.assert_called_with("[Notification] No contacts found for user123")

@pytest.mark.asyncio
async def test_metrics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.get("/metrics")

    assert resp.status_code == 200
    assert "notification_events_received_total" in resp.text