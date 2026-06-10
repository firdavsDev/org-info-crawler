# Project Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the OrgInfo crawler service so Docker setup, migrations, API requests, Kafka jobs, crawler execution, and failure handling work predictably.

**Architecture:** Keep the existing FastAPI + SQLAlchemy + Alembic + Kafka + Scrapy shape. Fix runtime blockers first, then harden state transitions, crawler behavior, tests, and docs. Do not redesign into a new stack unless the current architecture fails under real verification.

**Tech Stack:** Python 3.12, FastAPI, SQLAlchemy async, Alembic, aiokafka, Scrapy, Postgres, Docker Compose.

---

## Current Reality

The project is not fully finished. Several files are empty or placeholder-only, migrations are missing, runtime error handling is weak, and README setup claims behavior the checkout does not yet prove.

Known empty or placeholder files:
- `app/repositories/user_repo.py`
- `app/schemas/organization.py`

Known missing structure:
- `alembic/versions/`
- `tests/`

## File Map

- Modify `app/core/config.py` for explicit settings.
- Modify `app/core/security.py` to use `BASIC_AUTH_AUTO_CREATE`.
- Modify `app/core/kafka.py` for configurable Kafka and visible startup errors.
- Modify `app/models/organization.py` and `app/models/user.py` only if migrations reveal model gaps.
- Create `alembic/versions/<revision>_create_users_and_organizations.py`.
- Modify `app/api/routes.py` for TIN validation and schemas.
- Fill `app/schemas/organization.py`.
- Modify `app/services/org_service.py` for retry-safe job state.
- Modify `app/services/crawler_service.py` for timeout, cleanup, and empty-result handling.
- Modify `crawler/spiders/orginfo_spider.py` for no-result behavior.
- Modify `worker/worker.py` for structured failure logging.
- Create `tests/` with focused unit tests.
- Update `README.md` after runtime behavior is verified.

## Task 1: Database Migrations

- [x] Create `alembic/versions/` directory.
- [x] Add an Alembic revision that creates `users` with `id`, `username`, and `password_hash`.
- [x] Add `organizations` with `id`, unique `tin`, `status`, and JSON `payload`.
- [x] Import `app.models.user` and `app.models.organization` in `alembic/env.py` so metadata is visible.
- [x] Run `docker compose up -d db`.
- [x] Run `docker compose run --rm api alembic upgrade head`.
- [x] Verify with `docker compose exec db psql -U postgres -d orginfo -c "\\dt"`.

## Task 2: Configuration and Auth Safety

- [ ] Add settings for `KAFKA_BOOTSTRAP_SERVERS`, `ORGINFO_BASE_SEARCH_URL`, `CRAWLER_TIMEOUT_SECONDS`, and `BASIC_AUTH_AUTO_CREATE`.
- [ ] Make `basic_auth` honor `BASIC_AUTH_AUTO_CREATE`.
- [ ] Return `401` for unknown users when auto-create is disabled.
- [ ] Keep demo auto-create enabled only in local Compose config.
- [ ] Add password verification tests.

## Task 3: API Contracts and Validation

- [ ] Fill `app/schemas/organization.py` with response schemas for queued, failed, ready, and not-found states.
- [ ] Validate `tin` as digits-only and length-bounded before touching DB or Kafka.
- [ ] Return a clear `422` for invalid TIN input.
- [ ] Ensure `/org/{tin}` response shape stays stable: `{"status": ...}` or `{"status": "ready", "data": ...}`.
- [ ] Add tests for valid, invalid, missing, queued, failed, and ready states.

## Task 4: Job State and Retry Behavior

- [ ] Decide retry rule: failed jobs should be re-queued on the next `/org/{tin}` request.
- [ ] Update `OrgService.get_or_fetch` to requeue `failed` jobs and set status back to `queued`.
- [ ] Avoid duplicate Kafka messages for already `queued` or `processing` jobs.
- [ ] Add tests for first request, cache hit, failed retry, and duplicate request behavior.

## Task 5: Crawler Reliability

- [ ] Replace unmanaged temp files in `CrawlerService` with `TemporaryDirectory` or cleanup in `finally`.
- [ ] Add subprocess timeout using `CRAWLER_TIMEOUT_SECONDS`.
- [ ] Capture Scrapy stdout/stderr for logs.
- [ ] Raise a domain-specific exception when Scrapy returns no JSON item.
- [ ] Update `crawler/spiders/orginfo_spider.py` so no search result produces no item cleanly instead of following `None`.
- [ ] Add parser tests using saved HTML fixtures.

## Task 6: Worker Observability

- [ ] Replace broad silent `except Exception` in `worker/worker.py` with logging that includes `tin`, exception type, and message.
- [ ] Ensure failed jobs are committed to DB even when crawler crashes.
- [ ] Close Kafka consumer cleanly on shutdown.
- [ ] Add tests or a smoke script proving failed crawls become `failed`.

## Task 7: Test and Tooling Baseline

- [ ] Add `pytest`, `pytest-asyncio`, and `httpx` to `requirements.txt`.
- [ ] Create `tests/` with unit tests for service logic, auth behavior, validation, and crawler empty output.
- [ ] Add a simple command section to README: `pytest`, `compileall`, and Docker smoke test.
- [ ] Run `PYTHONPYCACHEPREFIX=/tmp/org-info-crawler-pycache python3 -m compileall app crawler worker alembic`.
- [ ] Run `pytest`.

## Task 8: Documentation Cleanup

- [ ] Fix README service names: the database service is `db`, container `orginfo_db`.
- [ ] Remove claims that migrations create tables until the migration file exists.
- [ ] Document local-only Basic Auth auto-create behavior.
- [ ] Document retry behavior for `failed` jobs.
- [ ] Add a final smoke-test flow with exact `curl` commands and expected statuses.

## Definition of Done

- [ ] Fresh clone can run with `docker compose build`.
- [ ] `docker compose up -d` starts all services.
- [ ] `alembic upgrade head` creates real tables.
- [ ] First valid `/org/{tin}` request queues work.
- [ ] Worker updates status to `ready` or `failed`.
- [ ] Failed jobs can be retried intentionally.
- [ ] Invalid TIN never reaches Kafka or crawler.
- [ ] Tests and compile check pass.
- [ ] README matches verified behavior, not theory.
