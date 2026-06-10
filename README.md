# 🚀 OrgInfo Scraper Service

FastAPI + Scrapy + Kafka + Postgres
Distributed, cached, background crawling service.

---

# 🧠 What you are running

When you start docker compose, you get:

| Service   | Purpose                         |
| --------- | ------------------------------- |
| api       | FastAPI HTTP server             |
| worker    | Kafka consumer + Scrapy crawler |
| postgres  | cache DB                        |
| kafka     | distributed queue               |
| zookeeper | kafka dependency                |

Flow:

```
GET /org/{tin}
   ↓
cache hit → return
cache miss → Kafka enqueue
   ↓
worker crawls
   ↓
DB updated
```

---

# ✅ Step 0 — Project tree (IMPORTANT)

Your root must look like this:

```
orginfo_service/
│
├── app/
├── crawler/
├── worker/
├── alembic/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
```

Run everything **from this folder**.

---

---

# ✅ Step 1 — Install Docker

If not installed:

Mac/Linux:

```
docker --version
docker compose version
```

If missing → install Docker Desktop.

---

---

# ✅ Step 2 — Build containers

First time only:

```
docker compose build
```

---

---

# ✅ Step 3 — Start services

```
docker compose up
```

You should see:

```
api_1       | Uvicorn running on http://0.0.0.0:8000
worker_1    | Kafka consumer started
kafka_1     | started
postgres_1  | database system ready
```

If you see this → system is alive.

---

---

# ✅ Step 4 — Run migrations

Open another terminal:

```
docker compose exec api alembic upgrade head
```

Creates tables:

* users
* organizations

---

---

# ✅ Step 5 — First request (auto creates user)

### Call API

```
curl -u admin:123 \
http://localhost:8000/org/304918546
```

Response:

```
{"status":"queued"}
```

Explanation:

* user auto-created if BASIC_AUTH_AUTO_CREATE=true
* job sent to Kafka
* worker crawling

---

---

# ✅ Step 6 — Wait 2–3 seconds

Then:

```
curl -u admin:123 \
http://localhost:8000/org/304918546
```

Now:

```
{
  "status": "ready",
  "data": {...}
}
```

Boom. Cached.

---

---

# ✅ Step 7 — Check job status

```
curl -u admin:123 \
http://localhost:8000/org/304918546/status
```

Returns:

```
queued | processing | ready | failed
```

---

---

# 🧪 Debugging tips

## Check worker logs

```
docker compose logs -f worker
```

You’ll see:

```
processing 304918546
saving result
```

---

## Check DB manually

```
docker compose exec db psql -U postgres -d orginfo
```

```
select tin, status from organizations;
```

---

## Restart only API

```
docker compose restart api
```

---

## Scale workers

```
docker compose up --scale worker=5
```

Now 5 parallel crawlers.

---

---

# 🔥 Dev workflow (fast iteration)

Instead of rebuild every time:

### docker-compose.yml

Add:

```yaml
volumes:
  - .:/app
```

Now code changes auto reflected.

Then:

```
docker compose restart api worker
```

---

# 🟢 Daily usage

Start:

```
docker compose up -d
```

Stop:

```
docker compose down
```

Rebuild:

```
docker compose build --no-cache
```

---
