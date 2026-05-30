import os

try:
    from twilio.rest import Client
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False

ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "mock_sid")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "mock_token")
FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "+1234567890")

async def send_sms_twilio(to: str, body: str):
    if not TWILIO_AVAILABLE:
        print(f"[Twilio Mock] Sending SMS to {to}: {body}")
        return
        
    client = Client(ACCOUNT_SID, AUTH_TOKEN)
    client.messages.create(to=to, from_=FROM_NUMBER, body=body)
