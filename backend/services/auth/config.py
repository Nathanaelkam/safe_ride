from pydantic_settings import BaseSettings, SettingsConfigDict

class AuthSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="AUTH_",
    )

    database_url: str = "postgresql+asyncpg://seva:seva@localhost:5432/auth_db"
    secret_key: str = "dev-secret-key"


# Create the global settings instance that database.py and main.py import
settings = AuthSettings()
