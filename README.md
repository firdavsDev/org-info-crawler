# OrgInfo Scraper Service

FastAPI + Scrapy + Kafka + Postgres  
Distributed, cached, background crawling service.

---

## What you are running

When you start Docker Compose, you get:

| Service   | Purpose                         |
| --------- | ------------------------------- |
| api       | FastAPI HTTP server             |
| worker    | Kafka consumer + Scrapy crawler |
| db        | Postgres cache DB (container: `orginfo_db`) |
| kafka     | Distributed queue               |
| zookeeper | Kafka dependency                |

**Flow:**

```
GET /org/{tin}
   ↓
cache hit → return data
cache miss (or previous failure) → enqueue to Kafka
   ↓
worker crawls orginfo.uz
   ↓
DB updated → status: ready | failed
```

> **Basic Auth auto-create:** `BASIC_AUTH_AUTO_CREATE=true` (the default in `docker-compose.yml`) automatically creates unknown users on first request. For local development only — set to `false` in production.

> **Failed-job retry:** If a crawl fails, the next `GET /org/{tin}` re-queues the job automatically. Intentional retry is simply calling the endpoint again.

---

## Step 1 — Build containers

```bash
docker compose build
```

---

## Step 2 — Start services

```bash
docker compose up -d
```

Verify all five services are running:

```bash
docker compose ps
```

---

## Step 3 — Run migrations

```bash
docker compose exec api alembic upgrade head
```

This creates the `users` and `organizations` tables.
Verify:

```bash
docker compose exec db psql -U postgres -d orginfo -c "\dt"
```

---

## Step 4 — Smoke test (full flow)

**Queue a crawl:**

```bash
curl -u admin:123 http://localhost:8000/org/304918546
# {"status":"queued"}
```

**Check status while crawling:**

```bash
curl -u admin:123 http://localhost:8000/org/304918546/status
# {"status":"processing"}
```

**After crawl completes (10–30 s):**

```bash
curl -u admin:123 http://localhost:8000/org/304918546
# {"status":"ready","data":{...}}
```

**Invalid TIN returns 422:**

```bash
curl -u admin:123 http://localhost:8000/org/INVALID
# HTTP 422  {"detail":"Invalid TIN: must be 9-14 digits."}
```

---

## TIN validation

TIN must be **9–14 digits** (`^\d{9,14}$`). Any other input is rejected with `422` before touching the database or Kafka.

---

## Development commands

```bash
# Tail logs
docker compose logs -f api worker

# Restart after code change
docker compose restart api worker

# Run unit tests (inside container)
docker compose exec api pytest tests/ -v

# Syntax check
docker compose exec api python -m compileall app crawler worker alembic

# Check DB
docker compose exec db psql -U postgres -d orginfo -c "select tin, status from organizations;"
```

---

## Stop / rebuild

```bash
docker compose down
docker compose build --no-cache
```
