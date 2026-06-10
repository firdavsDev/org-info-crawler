from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    BASIC_AUTH_AUTO_CREATE: bool = True
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/orginfo"
    BASE_URL: str = "http://localhost:8000"  # fallback
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    ORGINFO_BASE_SEARCH_URL: str = "https://orginfo.uz/uz/search/organizations/"
    CRAWLER_TIMEOUT_SECONDS: int = 30


settings = Settings()
