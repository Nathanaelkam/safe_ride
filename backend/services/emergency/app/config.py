from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Emergency Service configuration loaded from environment variables."""

    # Redis event bus connection URL.
    # Override via the EMERGENCY_REDIS_URL environment variable.
    emergency_redis_url: str = "redis://localhost:6379/0"

    # Redis stream / channel key for SOS events consumed by the Notification Service.
    sos_stream_key: str = "seva:events:sos_triggered"

    # Recognised voice trigger phrases (comma-separated string in env).
    voice_trigger_phrases: str = "help,emergency,sos,danger,panic"

    model_config = {"env_file": ".env", "extra": "ignore"}

    @property
    def trigger_phrases(self) -> list[str]:
        """Return voice trigger phrases as a clean lowercase list."""
        return [p.strip().lower() for p in self.voice_trigger_phrases.split(",")]


settings = Settings()
