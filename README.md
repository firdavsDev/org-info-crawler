# OrgInfo Crawler

FastAPI + React + Scrapy + Kafka + Postgres  
Distributed, cached, background crawling service with a staff web UI.

---

## Architecture

```
Browser (React SPA :3000)
       ↓  HTTP Basic Auth
   Nginx (proxies /api/ → FastAPI :8000)
       ↓
   FastAPI API
       ↓
  Kafka queue → Worker → Scrapy → orginfo.uz
       ↓
   Postgres (cache)
```

### Services

| Service    | Port | Purpose                                      |
|------------|------|----------------------------------------------|
| frontend   | 3000 | React SPA (Nginx) — staff UI + API docs      |
| api        | 8000 | FastAPI HTTP server                          |
| worker     | —    | Kafka consumer + Scrapy crawler              |
| db         | —    | Postgres cache database                      |
| kafka      | 9092 | Distributed job queue                        |
| zookeeper  | —    | Kafka dependency                             |

### Request flow

```
GET /org/{tin}
   ↓
cache hit  →  return data immediately
cache miss →  enqueue to Kafka
   ↓
worker picks up job → crawls orginfo.uz
   ↓
DB updated → status: ready | failed
```

---

## Setup

### Prerequisites

- Docker ≥ 24
- Docker Compose v2

### Step 1 — Build images

```bash
docker compose build
```

### Step 2 — Start all services

```bash
docker compose up -d
```

Verify all services are up:

```bash
docker compose ps
```

### Step 3 — Apply database migrations

```bash
docker compose exec api alembic upgrade head
```

Confirm tables were created:

```bash
docker compose exec db psql -U postgres -d orginfo -c "\dt"
```

### Step 4 — Create the first staff user

User accounts are **only** created via the CLI. Auto-creation is disabled.

```bash
docker compose exec api python manage.py createuser
# Username: admin
# Password: (hidden)
# Password (confirm): (hidden)
# User 'admin' created successfully.
```

You can run this command any time to add more staff accounts.  
If a username already exists, the command exits with an error.

### Step 5 — Open the web UI

```
http://localhost:3000
```

Log in with the credentials you just created. You will be redirected to the
dashboard automatically after a successful login.

---

## Web UI

### Org Lookup (dashboard)

1. Enter a 9–14 digit TIN / INN in the search box.
2. Press **Search**.
3. If the record is cached and ready, results appear immediately.
4. If a crawl is needed, the page polls every 2 seconds (up to 60 s) and updates
   automatically when the result arrives.
5. Status badges indicate: **Queued → Processing → Ready / Failed**.

### API Docs

Click **API Docs** in the top navigation bar to see:

- All available endpoints with parameter descriptions
- Example `curl` and JavaScript `fetch` requests
- Example JSON responses for each status
- A link to the interactive **Swagger UI** (`/docs`) for developers

---

## REST API

All endpoints require HTTP Basic Authentication.

### `GET /auth/me`

Verify credentials and return the authenticated username.

```bash
curl -u admin:password http://localhost:8000/auth/me
# {"username":"admin"}
```

### `GET /org/{tin}`

Look up an organization. Returns cached data immediately or enqueues a crawl.

```bash
# First call — enqueues crawl
curl -u admin:password http://localhost:8000/org/304918546
# {"status":"queued","_meta":{...}}

# After crawl completes (10–30 s)
curl -u admin:password http://localhost:8000/org/304918546
# {"status":"ready","data":{...},"_meta":{...}}
```

### `GET /org/{tin}/status`

Poll crawl status without retrieving the full record.

```bash
curl -u admin:password http://localhost:8000/org/304918546/status
# {"status":"processing"}
# {"status":"ready"}
# {"status":"failed","error":"..."}
```

**TIN validation:** must match `^\d{9,14}$`. Any other value returns `HTTP 422`.

```bash
curl -u admin:password http://localhost:8000/org/INVALID
# HTTP 422  {"detail":"Invalid TIN: must be 9–14 digits."}
```

**Failed-job retry:** if a crawl fails, calling `GET /org/{tin}` again automatically re-queues it.

---

## Development commands

```bash
# Tail API and worker logs
docker compose logs -f api worker

# Restart after a code change
docker compose restart api worker

# Run unit tests
docker compose exec api pytest tests/ -v

# Syntax check
docker compose exec api python -m compileall app crawler worker alembic

# Inspect the database
docker compose exec db psql -U postgres -d orginfo \
  -c "SELECT tin, status, crawled_at FROM organizations ORDER BY crawled_at DESC LIMIT 20;"
```

---

## Configuration

All settings are environment variables. Defaults are in `docker-compose.yml` and `app/core/config.py`.

| Variable                    | Default                                      | Description                                   |
|-----------------------------|----------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`              | `postgresql+asyncpg://postgres:postgres@db:5432/orginfo` | Async Postgres URL           |
| `KAFKA_BOOTSTRAP_SERVERS`   | `kafka:9092`                                 | Kafka broker address                          |
| `ORGINFO_BASE_SEARCH_URL`   | `https://orginfo.uz/uz/search/organizations/` | Crawler target                               |
| `CRAWLER_TIMEOUT_SECONDS`   | `30`                                         | Per-job crawl timeout                         |
| `CACHE_TTL_DAYS`            | `30`                                         | Re-crawl records older than N days (0 = never)|
| `BASIC_AUTH_AUTO_CREATE`    | `false`                                      | Create unknown users on first request (dev only) |

---

## Stop / rebuild

```bash
# Stop all services
docker compose down

# Full rebuild (clears image cache)
docker compose build --no-cache
docker compose up -d
```

