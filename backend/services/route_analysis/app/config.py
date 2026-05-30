from pydantic_settings import BaseSettings, SettingsConfigDict

class RouteAnalysisSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="ROUTE_ANALYSIS_")

    database_url: str = "postgresql+asyncpg://seva:seva@localhost:5432/tracking_db"
    redis_url: str = "redis://localhost:6379/0"
    
    # Redis channels / streams
    gps_updates_channel: str = "location_updates"
    anomaly_detected_channel: str = "anomaly.detected"

settings = RouteAnalysisSettings()
