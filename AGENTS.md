# Repository Guidelines

## Project Structure & Module Organization

This service combines FastAPI, Scrapy, Kafka, Postgres, and Alembic.

- `app/` contains API routes, services, repositories, models, schemas, and core infrastructure.
- `app/api/routes.py` exposes `/org/{tin}` and `/org/{tin}/status`.
- `app/services/` owns crawl orchestration and organization lookup behavior.
- `app/repositories/` isolates database access.
- `crawler/` contains Scrapy settings, middleware, and `crawler/spiders/orginfo_spider.py`.
- `worker/` contains the Kafka consumer that runs crawls and updates job status.
- `alembic/` and `alembic.ini` handle database migrations.

There is no `tests/` directory. Add one before claiming automated coverage exists.

## Build, Test, and Development Commands

Run commands from the repository root.

- `docker compose build` builds the API and worker image.
- `docker compose up -d` starts API, worker, Postgres, Kafka, and Zookeeper.
- `docker compose exec api alembic upgrade head` applies database migrations.
- `docker compose logs -f api worker` tails request and crawl behavior.
- `docker compose restart api worker` reloads services after code changes.
- `curl -u admin:123 http://localhost:8000/org/304918546` smoke-tests queueing and cached lookup.
- `curl -u admin:123 http://localhost:8000/org/304918546/status` checks crawl state.

## Coding Style & Naming Conventions

Use Python 3 style with 4-space indentation, explicit imports, and small modules with clear ownership. Keep async database and Kafka flows async end-to-end. Prefer service classes for workflow logic, repositories for SQLAlchemy access, and schemas for request/response contracts. Name modules in `snake_case`, classes in `PascalCase`, and enum values clearly enough to survive log inspection.

No formatter or linter is configured yet. If you add one, wire it into the documented commands.

## Testing Guidelines

Automated tests are not present. For now, verify changes with Docker Compose, Alembic migrations, API smoke requests, and worker logs. When adding tests, use `tests/` with names like `test_org_service.py` and cover cache-hit, cache-miss, Kafka enqueue, worker failure, and crawler parsing paths.

## Commit & Pull Request Guidelines

History uses descriptive sentence-style commits, for example: `Initial commit: set up FastAPI application...`. Keep commits focused and name the subsystem touched.

Pull requests should include a short summary, verification commands, migration notes, and any API contract changes. Include logs or curl output for crawler, Kafka, or database behavior because these failures hide in runtime wiring, not pretty diagrams.

## Security & Configuration Tips

Do not hard-code production credentials. Local defaults live in `docker-compose.yml` and `app/core/config.py`; override them with environment variables for real deployments. Treat Basic Auth auto-create behavior as development-friendly but production-dangerous unless explicitly controlled.
