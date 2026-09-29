# Didox gateway endpoints

## Context

The committee already calls Didox (a partner REST API) through a legacy sync client (`DidoxIntegration`, using requests and aiohttp) for four lookups:

- organization info by INN/PINFL, plus the bank name
- the bank list
- waybill regions
- waybill districts

We want OrgInfo Crawler to expose these lookups, so other committee developers can use them from their own projects. They authenticate with our Basic Auth and don't each need the Didox partner token or a copy of that client.

**Decisions made:**
- Separate `/didox/*` namespace, same Basic Auth as the rest of the API.
- Synchronous call to Didox with Redis caching. No Kafka: Didox is an instant REST call, not a slow crawl.
- Didox data is **not** merged into `/org/{tin}`.
- Frontend: add the endpoints to the API Docs page (cards, Try it, sidebar links). No dashboard changes.
- `/banks/all/` is called **without** `Partner-Authorization`, matching the legacy code. The other three calls send it.
- The user will put `DIDOX_BASE_URL` and `PARTNER_AUTHORIZATION` in the local `.env`, so the live path can be smoke-tested.

The env var names are the legacy client's own (`DIDOX_BASE_URL`, `PARTNER_AUTHORIZATION`), so teams can reuse their existing values.

## Step 0

Copy this plan to `PLAN.md` in the repo root, as the global CLAUDE.md requires. Don't commit.

## API contract (new)

All endpoints are `GET` and require Basic Auth. Successful responses use a `data` + `_meta` envelope, the same `_meta` as `routes.py:_meta`.

| Endpoint | Didox upstream | Partner header | Cache key / TTL |
|---|---|---|---|
| `/didox/org/{tin}` | `GET {base}/utils/info/{tin}/` | yes | `didox:info:{tin}` / `DIDOX_INFO_TTL_SECONDS` (1 day) |
| `/didox/banks` | `GET {base}/banks/all/` | **no** | `didox:banks` / `DIDOX_REFERENCE_TTL_SECONDS` (7 days) |
| `/didox/regions` | `GET {base}/utils/waybills/regions/` | yes | `didox:regions` / reference TTL |
| `/didox/regions/{region_id}/districts` | `GET {base}/utils/waybills/districts?regionId=` | yes | `didox:districts:{id}` / reference TTL |

- `/didox/org/{tin}` returns `{"data": <raw Didox info>, "bank_name": str|null, "_meta": {...}}`. The TIN is checked by the existing `_validate_tin`, so a bad TIN gets 422.
- The other three endpoints return `{"data": [...], "_meta": {...}}`.
- The Didox payload is passed through untouched. We add only `bank_name`.

**Error mapping.** One exception family, one handler, and errors keep the same `{"detail": ...}` shape as `HTTPException`:

| Case | HTTP | Detail |
|---|---|---|
| Not configured (missing base URL, or missing token on a header'd call) | 503 | "Didox integration is not configured." |
| Unknown INN: Didox 404, or a 200 whose body is empty / `{}` / `null` | 404 | "Organization not found in Didox." |
| Didox 401/403 | 502 | Logged as an error with a hint to check `PARTNER_AUTHORIZATION` |
| Other 4xx/5xx, bad JSON, network error, or a 3xx | 502 | |
| Timeout | 504 | |

- Errors and empty bodies are **never** cached.
- An empty districts list is returned as 200 `[]`, but it is not cached.
- The unknown-INN rule is a best guess. The Didox docs didn't load, and the legacy code never checks the status code. Confirm it live in verification and adjust.

## Files

**`app/core/config.py`.** Add:
- `DIDOX_BASE_URL: str = ""`
- `PARTNER_AUTHORIZATION: str = ""`
- `DIDOX_TIMEOUT_SECONDS: float = 10`
- `DIDOX_INFO_TTL_SECONDS: int = 86_400`
- `DIDOX_REFERENCE_TTL_SECONDS: int = 604_800`

Default them to empty. Don't copy the legacy `os.environ[...]`, which would crash at import time for the worker and the tests.

**`app/core/cache.py`.**
- Add a `prefix` argument to `_RedisCache.__init__` that defaults to the current `_PREFIX`. `cache = _RedisCache()` stays unchanged for `OrgService` and `worker/worker.py`.
- Rename the `tin` param to `key`. Callers pass it positionally, so nothing breaks.
- Widen the payload type hint to `dict | list`.
- Add `didox_cache = _RedisCache(prefix="didox:")`.

**`app/core/didox.py` (new).** A singleton infrastructure client, following the `app/core/kafka.py` pattern.
- Exceptions: `DidoxError` (base, with `status_code` and `detail`), plus `DidoxNotConfigured`, `DidoxNotFound`, `DidoxUpstreamError` and `DidoxTimeout`.
- `DidoxClient(http: httpx.AsyncClient | None = None)`:
  - `start()` and `stop()` own an `httpx.AsyncClient(timeout=settings.DIDOX_TIMEOUT_SECONDS)`. The client is injectable so tests can use `httpx.MockTransport`.
  - `get_info(inn)`, `get_banks()`, `get_regions()`, `get_districts(region_id)`.
  - One private `_get(path, params=None, partner_auth=True)` builds `f"{base.rstrip('/')}{path}"`.
  - Paths stay **exactly** as in the legacy client. `info/{inn}/`, `regions/` and `banks/all/` have trailing slashes; `districts` has none. httpx doesn't follow redirects, so a wrong slash shows up as an upstream error.
  - Uses the `Content-Type: application/json` header.
- `didox_client = DidoxClient()`.
- The legacy `asyncio.run` / `request_sender` / `tg_alert` code is dropped. It's replaced by `logging`, and the token is never logged.

**`app/services/didox_service.py` (new).** `DidoxService(client, cache)` holds the caching and enrichment logic:
- `get_org(tin)`: cached raw info. `bank_name` is resolved from the **cached** bank list by `bankId`, comparing with `str()` on both sides. This replaces the legacy code's download of the full list on every lookup. If the bank lookup fails, `bank_name` is `None` and a warning is logged, but the org response still succeeds, as in the legacy code.
- `get_banks()`, `get_regions()`, `get_districts(region_id)`: cache-aside with the reference TTL.

**`app/api/didox_routes.py` (new).**
- `APIRouter(prefix="/didox", tags=["didox"])` with the four endpoints above.
- Reuses `_validate_tin` and `_meta` from `app/api/routes.py`.
- `region_id: int` is the path param.
- Builds `DidoxService(didox_client, didox_cache)` per request, the same way `OrgService(repo)` is built.
- Defines `didox_error_handler(request, exc)`, which returns a `JSONResponse` with `exc.status_code` and `exc.detail`.

**`app/main.py`.**
- `include_router(didox_router)` and `add_exception_handler(DidoxError, didox_error_handler)`.
- Startup: `await didox_client.start()`.
- Shutdown: `await didox_client.stop()` and `await didox_cache.close()`.

**`docker-compose.yml`.** In the `api` env, pass through `DIDOX_BASE_URL: ${DIDOX_BASE_URL:-}` and `PARTNER_AUTHORIZATION: ${PARTNER_AUTHORIZATION:-}`. The worker doesn't need them. No hardcoded secrets.

**`.env.example`.** Add empty `DIDOX_BASE_URL=` and `PARTNER_AUTHORIZATION=` lines.

**`README.md`.**
- Add a "Didox endpoints" section with curl examples and the error table.
- Add rows to the configuration table.
- Mention Didox in the architecture sketch.
- Add a line for the consuming teams: they need Basic Auth accounts, which admins create with `manage.py createuser`. Suggest one account per consuming project.

**Frontend:**
- `frontend/src/pages/ApiDocsPage.jsx`:
  - Add 4 `ENDPOINTS` entries, `get-didox-org`, `get-didox-banks`, `get-didox-regions` and `get-didox-districts`, each with EN and UZ descriptions, params, responses (200/404/502/503 plus the shared `UNAUTHORIZED`), curl and fetch examples.
  - Add `region_id` to the shared `values` state.
  - Build the sample 200 bodies from the **real** response structure seen during verification, with placeholder values. Don't invent Didox fields.
- `frontend/src/components/app-sidebar.jsx`: add the 4 hardcoded links, `/docs#get-didox-...`, under API Docs.

**Tests (TDD: write them first).**
- `tests/test_didox_client.py`, with `httpx.MockTransport`:
  - exact URL per method, including trailing slashes and the `regionId` param
  - partner header present on info/regions/districts and absent on banks
  - 404 and empty body both give `DidoxNotFound`
  - 500 and 401 give `DidoxUpstreamError`
  - `httpx.TimeoutException` gives `DidoxTimeout`
  - missing config gives `DidoxNotConfigured`
- `tests/test_didox_service.py`, with a fake client and a fake cache in the style of `tests/test_org_service.py`:
  - a cache hit skips the client
  - a miss stores the result with the right TTL
  - `bank_name` is resolved, including across `str`/`int` `bankId`
  - a bank lookup failure is tolerated
  - errors and empty lists are not cached
- `tests/test_didox_routes.py`:
  - a minimal `FastAPI()` with `didox_router`, the handler, and a `basic_auth` dependency override
  - the service is monkeypatched
  - asserts 200 envelope, 422 bad TIN, and 404/502/503/504 status + `detail`

## Verification

1. `docker compose exec api pytest tests/ -v`: the new tests pass and the existing suite still passes.
2. `docker compose up -d api` to recreate the container. `restart` doesn't pick up new env vars.
3. Live smoke test with the user's `.env` credentials:
   - `curl -u <user>:<pass> localhost:8000/didox/org/304918546`: 200, with data and `bank_name`.
   - Repeat the call and expect a lower `_meta.elapsed_ms`.
   - `/didox/org/999999999`: check what Didox really returns for an unknown INN.
     - Then run `docker compose exec redis redis-cli EXISTS didox:info:999999999`. It must print `0`.
     - If Didox answers an unknown INN with a non-empty error body, choose a field that proves the record is a real org (for example `tin`/`inn`/`name` being present), from the live response. `DidoxClient.get_info` requires that field before returning, so the error body is never cached. Add a test for it.
   - `/didox/banks`, `/didox/regions`, `/didox/regions/<id>/districts`: 200 lists.
   - `/didox/org/abc`: 422.
   - A request without `-u`: 401.
4. `docker compose exec redis redis-cli --scan --pattern 'didox:*'` shows the expected keys.
5. With `PARTNER_AUTHORIZATION` blank, recreate the api container: `/didox/org/...` returns 503.
6. `docker compose logs api | grep -cF "<token>"` returns `0`, meaning the token was never logged. Run it without echoing the token.
7. `docker compose up -d --build frontend`, then on `/docs`: the 4 new cards render, Try it works, and the sidebar links scroll to the right card.

If the live Didox call can't be made, say plainly that the live path is unverified. Unit tests alone don't show the integration works.

## Out of scope

- Dashboard Didox panel.
- Merging Didox into `/org/{tin}`.
- Search-history logging for Didox lookups.
- Telegram alerts.
- A `/didox/banks/{id}` endpoint: the org response already carries `bank_name`.

## As built — differences from the plan above

Found by calling live Didox on 2026-09-29 or requested during the work:

- **Client lifecycle:** the httpx client is created lazily and closed by `didox_client.close()` on shutdown, the same pattern as `_RedisCache`. There is no `start()` and no startup hook.
- **Unknown TIN:** Didox answers with **HTTP 200 and a record of empty fields** (`"tin": ""`, `"name": null`), not a 404. `get_info` therefore requires one of `tin`/`personalNum`/`name`/`fullName`/`shortName` to be non-empty; otherwise it answers 404. A non-object body gives 502.
- **Bank name:** org info has **no `bankId`**. The bank is matched by `bankCode` (falling back to `mfo`) against `bankId` in `/banks/all/` (5-digit MFO codes, e.g. `00475`). The legacy `bankId` lookup would always have returned `None`.
- **Org cache:**
  - The enriched answer is cached under `didox:org:{tin}` (not `info:{tin}`), so the 557 KB bank list is only read on a miss.
  - If the bank lookup fails, the org is returned without being cached.
- **Reference data:** a 404 or empty body on banks/regions/districts gives **502**, since it means a wrong base URL or path, not 404. An unknown region returns 200 `[]`, and that is not cached.
- **Swagger:**
  - Docs-only response models live in `app/schemas/didox.py`, wired via `responses=` so they never filter or validate the pass-through. The routes also got summaries and 404/502/503/504 docs.
  - The core routes are tagged `org-info` (they were "default").
  - Tag descriptions are set in `app/main.py`.
- **`/docs` page:** the samples use the real Didox field names and types, with dummy personal data.
- **Layout** (requested mid-task):
  - The content column is centered (`mx-auto`).
  - `/organizations` widens to 96rem.
  - `DESIGN.md` is updated to match.

**Verified live:**
- known TIN → 200 with `bank_name`; the second call takes 0.3 ms from cache
- unknown TIN → 404 and not cached
- bad TIN → 422
- banks, regions and districts return 2093, 15 and 16 items
- Redis TTLs are 86 400 s and 604 800 s
- the token appears 0 times in the logs

**Not verified live:**
- a 503 with a blank token (covered by unit tests)
- curl with a real Basic Auth account (none available; the in-process check stubbed only auth)

## Later additions (requested during the session)

- **API Docs page:** endpoints are grouped into *Organization registry* (`org-info`) and *Didox* (`didox`) sections, matching the Swagger tags. The sidebar shows the same groups.
- **`/search/history` removed:**
  - The route, the per-lookup logging, the `SearchLog` model/repository and `SEARCH_HISTORY_LIMIT` are gone.
  - Migration `0005` drops `search_logs`. It was tested up and down on a throwaway DB and has **not been run** on the real DB.
  - The Recent chips and the Try-it TIN prefill now come from `/orgs` (newest crawl first), via `RecentOrgsProvider`.
- **Didox in the lookup page (`/`):** the separate `/didox` page was folded into the lookup page, which now has three result tabs.
  - **Registry (orginfo.uz):** the crawled record.
  - **Didox:** the record grouped into Organization, Leadership, Bank, Tax, Address and Other, with copy buttons.
  - **Directory:** a bank filter by name or MFO, and a region → district picker.
  - One search runs both lookups, and each tab shows its own status dot.
  - The tab lives in `?tab=`. Searches carry a `searchId` in router state, so switching tabs never re-runs a crawl.
  - Components: `DidoxLookup`, `DidoxDirectory`, `DidoxRecord`.
- **API Docs cards collapse:** they start collapsed, and opening one from the sidebar (`#get-…`) expands it and scrolls to it.
- **CORS:** unchanged. The consumers are backend services.
