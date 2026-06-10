---
applyTo: "**/*.py"
---

# OrgInfo Crawler — Project Conventions

## Architecture

Strict layered architecture. Never skip layers or mix concerns:

```
Routes (app/api/) → Services (app/services/) → Repositories (app/repositories/) → Models (app/models/)
```

- **Routes** only call services and handle HTTP concerns (auth, status codes).
- **Services** contain business logic and interact with Kafka.
- **Repositories** are the only layer that touches the DB session. All methods are `async`.
- **Models** are pure SQLAlchemy ORM classes — no business logic.

## FastAPI & Async SQLAlchemy

- Always use `async with SessionLocal() as db:` inside routes or services — never hold a session across await boundaries outside this context manager.
- Use `Mapped[T]` and `mapped_column(...)` for all model columns. Never use the old `Column(...)` style.
- Models must inherit from `app.core.database.Base` (which inherits `DeclarativeBase`).
- Repositories receive `db` (the session) via constructor injection: `OrgRepository(db)`.

```python
# Correct model column style
class MyModel(Base):
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
```

## Organization Job Status Flow

Status must always follow this exact sequence — never skip or reverse:

```
queued → processing → ready
queued → processing → failed
```

Use `JobStatus` enum from `app.models.organization` for all status values. Never use raw strings.

## Kafka

- The singleton `producer` is imported from `app.core.kafka`.
- Topic name constant is `TOPIC = "org_jobs"` — use it, don't hardcode the string elsewhere.
- All messages are JSON-serialized dicts: `{"tin": "<tin_value>"}`.
- The worker (`worker/worker.py`) is the only consumer. It sets status to `processing` before crawling.

```python
# Correct Kafka send
await producer.send("org_jobs", {"tin": tin})
```

## Scrapy Crawler

- The spider name is `"orginfo"` (defined in `crawler/spiders/orginfo_spider.py`).
- `CrawlerService` in `app/services/crawler_service.py` runs Scrapy as a subprocess with a temp output file — do not refactor to in-process Scrapy.
- Use `selectolax` for HTML parsing inside spiders. Do not introduce BeautifulSoup.
- Scrapy settings are in `crawler/settings.py`. `DOWNLOAD_DELAY`, `AUTOTHROTTLE_ENABLED`, and `ROBOTSTXT_OBEY` are set — do not disable them.

## Configuration & Secrets

- All settings live in `app/core/config.py` as a `pydantic_settings.BaseSettings` subclass.
- Read secrets from environment variables only. Never hardcode credentials.
- `DATABASE_URL` must use `postgresql+asyncpg://` scheme for async support.
- The `.env` file is gitignored — never commit it.

## Alembic Migrations

- Always generate migrations via autogenerate: `alembic revision --autogenerate -m "<message>"`.
- Apply inside the running container: `docker compose exec api alembic upgrade head`.
- `target_metadata = Base.metadata` in `alembic/env.py` must include all models — import them if adding new ones.
- `DATABASE_URL` is read from the environment in `alembic/env.py` — it must be set before running migrations.

## Docker

- All services are defined in `docker-compose.yml`. Run everything from the project root.
- Build once before first start: `docker compose build`.
- The `api` container runs `uvicorn app.main:app ...`. The `worker` container runs `worker/worker.py`.
- Both containers share the same image built from `Dockerfile` — keep shared code under `app/`, `crawler/`, `worker/`.

## Authentication

- HTTP Basic Auth via `app.core.security.basic_auth` dependency.
- `BASIC_AUTH_AUTO_CREATE=True` (default): first login auto-creates the user with bcrypt-hashed password.
- All routes must use `user=Depends(basic_auth)`.
- Password hashing uses `passlib` with `bcrypt` — do not use any other scheme.
