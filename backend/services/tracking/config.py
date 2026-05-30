from pydantic_settings import BaseSettings, SettingsConfigDict


class TrackingSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="TRACKING_")

    database_url: str = "postgresql+asyncpg://seva:seva@localhost:5432/tracking_db"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = "change-me-in-prod"   # same secret as Auth Service to decode JWT
    algorithm: str = "HS256"


settings = TrackingSettings()