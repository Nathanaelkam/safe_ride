import logging
from .config import settings

logger = logging.getLogger("auth.email")

def send_otp_email(to_email: str, code: str) -> None:
    """Send an OTP email. In dev mode, log the code to the console."""
    if settings.email_enabled:
        # Production: use SMTP or a transactional email provider
        import smtplib
        from email.mime.text import MIMEText
        # … SMTP logic here (see appendix)
        pass
    else:
        logger.info(f"OTP for {to_email}: {code}")
        print(f"OTP for {to_email}: {code}") 