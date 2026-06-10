from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    BASIC_AUTH_AUTO_CREATE: bool = False
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@db:5432/orginfo"
    BASE_URL: str = "http://localhost:8000"  # fallback
    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    ORGINFO_BASE_SEARCH_URL: str = "https://orginfo.uz/uz/search/organizations/"
    CRAWLER_TIMEOUT_SECONDS: int = 30
    # Re-crawl cached records older than this many days (0 = never expire)
    CACHE_TTL_DAYS: int = 30
    REDIS_URL: str = "redis://redis:6379/0"
    # Number of crawler jobs the worker processes concurrently
    WORKER_CONCURRENCY: int = 4
    # How many recent searches to return per user
    SEARCH_HISTORY_LIMIT: int = 20
    # Dead-letter queue: topic name and max crawl attempts before DLQ
    KAFKA_DLQ_TOPIC: str = "org_jobs_dlq"
    WORKER_MAX_RETRIES: int = 3


settings = Settings()
