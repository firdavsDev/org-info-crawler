from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    BASIC_AUTH_AUTO_CREATE: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/orginfo"
    BASE_URL: str = "http://localhost:8000"  # fallback


settings = Settings()
