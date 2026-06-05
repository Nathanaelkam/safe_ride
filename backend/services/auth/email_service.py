import smtplib
from email.mime.text import MIMEText
from .config import settings

def send_otp_email(to_email: str, code: str) -> None:
    if not settings.email_enabled:
        import logging
        logging.getLogger("auth.email").info(f"OTP for {to_email}: {code}")
        return

    msg = MIMEText(f"Your Seva verification code is: {code}")
    msg["Subject"] = "Seva – Email Verification"
    msg["From"] = settings.email_sender
    msg["To"] = to_email

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.email_sender, settings.email_password)
        server.sendmail(settings.email_sender, [to_email], msg.as_string())