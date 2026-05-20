from pydantic_settings import BaseSettings

class AuthSettings(BaseSettings):
    database_url: str = "postgresql+asyncpg://seva:seva@localhost:5432/auth_db"
    secret_key: str = "dev-secret-key"   # will be used later for JWT

    class Config:
        env_file = ".env"
        env_prefix = "AUTH_"   # e.g., AUTH_DATABASE_URL

settings = AuthSettings()