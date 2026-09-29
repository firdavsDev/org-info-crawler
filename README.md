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
   FastAPI API ──── /didox/* ──→ Didox partner API (Redis-cached)
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
6. Results are split into tabs, and each search fills the first two at once:
   - **Registry (orginfo.uz)**: the crawled record described above.
   - **Didox**: the Didox record. It answers instantly, even while the crawl is still running.
   - **Directory**: the Didox bank list and the region → district picker. It needs no TIN.

   Each tab shows its own status dot.

### API Docs

Click **API Docs** in the sidebar to see (its endpoints are also listed under it for direct jumps):

- All available endpoints, grouped into Organization registry and Didox (the same grouping as the Swagger tags). Each endpoint card collapses; opening a card from the sidebar expands it.
- Parameter descriptions for each endpoint
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

### Didox endpoints

The service proxies the Didox partner API. Other teams can then get Didox data with
their own Basic Auth account, without holding the Didox partner token. An admin creates
the accounts with `python manage.py createuser`. Use one account per consuming project,
so access can be revoked per project.

Unlike `/org/{tin}`, these calls are synchronous: they go straight to Didox (no Kafka),
and answers are cached in Redis. Org info is cached for 1 day, and banks, regions and
districts for 7 days. Errors and empty answers are never cached.

| Endpoint                                | Returns                                                    |
|-----------------------------------------|------------------------------------------------------------|
| `GET /didox/org/{tin}`                  | Didox record for a TIN/INN or PINFL, plus `bank_name`      |
| `GET /didox/banks`                      | All banks                                                  |
| `GET /didox/regions`                    | Waybill regions                                            |
| `GET /didox/regions/{region_id}/districts` | Waybill districts of one region                         |

```bash
curl -u admin:password http://localhost:8000/didox/org/304918546
# {"data":{...Didox record, unchanged...},"bank_name":"...","_meta":{...}}

curl -u admin:password http://localhost:8000/didox/regions
# {"data":[...],"_meta":{...}}
```

`data` is the Didox response passed through unchanged. Errors use the same `{"detail": ...}` shape:

| Status | When                                                              |
|--------|-------------------------------------------------------------------|
| `404`  | Didox has no record for this TIN                                  |
| `422`  | TIN is not 9–14 digits, or `region_id` is not an integer         |
| `502`  | Didox returned an error or an unreadable response                 |
| `503`  | `DIDOX_BASE_URL` / `PARTNER_AUTHORIZATION` are not set            |
| `504`  | Didox did not answer within `DIDOX_TIMEOUT_SECONDS`               |

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

Ports live in the root `.env` (see `.env.example`); `docker compose` and the Vite dev server both read it:

| Variable            | Default | Description                                                         |
|---------------------|---------|---------------------------------------------------------------------|
| `API_PORT`          | `8000`  | Host port for the FastAPI server (Swagger UI at `/docs`)            |
| `FRONTEND_PORT`     | `3000`  | Host port for the Nginx-served web UI                               |
| `FRONTEND_DEV_PORT` | `5173`  | Port for `npm run dev`; its `/api` proxy targets `API_PORT`         |

After changing `API_PORT` or `FRONTEND_PORT`, run `docker compose up -d --build api frontend`
(the frontend image bakes `API_PORT` into its Swagger link and curl examples).

| Variable                    | Default                                      | Description                                   |
|-----------------------------|----------------------------------------------|-----------------------------------------------|
| `DATABASE_URL`              | `postgresql+asyncpg://postgres:postgres@db:5432/orginfo` | Async Postgres URL           |
| `KAFKA_BOOTSTRAP_SERVERS`   | `kafka:9092`                                 | Kafka broker address                          |
| `ORGINFO_BASE_SEARCH_URL`   | `https://orginfo.uz/uz/search/organizations/` | Crawler target                               |
| `CRAWLER_TIMEOUT_SECONDS`   | `30`                                         | Per-job crawl timeout                         |
| `CACHE_TTL_DAYS`            | `30`                                         | Re-crawl records older than N days (0 = never)|
| `DIDOX_BASE_URL`            | *(empty)*                                    | Didox partner API base URL; set it in `.env`  |
| `PARTNER_AUTHORIZATION`     | *(empty)*                                    | Didox partner token; set it in `.env`, never commit it |
| `DIDOX_TIMEOUT_SECONDS`     | `10`                                         | Per-request timeout for Didox calls           |
| `DIDOX_INFO_TTL_SECONDS`    | `86400`                                      | Redis TTL for `/didox/org/{tin}` answers      |
| `DIDOX_REFERENCE_TTL_SECONDS` | `604800`                                   | Redis TTL for banks, regions and districts    |

After changing the Didox values in `.env`, run `docker compose up -d api`. `restart` does not pick up new env values.

---

## Stop / rebuild

```bash
# Stop all services
docker compose down

# Full rebuild (clears image cache)
docker compose build --no-cache
docker compose up -d
```

