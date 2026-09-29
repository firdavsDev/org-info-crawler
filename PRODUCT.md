# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Internal staff with accounts that administrators create through the CLI (`manage.py createuser`); there is no self sign-up. They use the tool many times a day to check counterparties, looking up Uzbek organizations by TIN/INN. Developers on other teams also use the REST API directly to build integrations, so the API Docs page is a first-class audience.

## Product Purpose

OrgInfo Crawler returns an organization's registry record for a TIN/INN. It crawls orginfo.uz in the background, caches the result, and reuses the cached record on later lookups. Staff use it for due diligence: confirming a company's name, legal status, director, founders and shares, charter fund, and contacts before a deal or payment. A good session is a fast lookup that ends with the answer on screen and, when needed, an Excel export.

## Positioning

The service turns a slow, manual website lookup into a cached, authenticated internal lookup with a stable API. Repeat lookups are instant, uncached ones crawl in the background with visible progress, and the same data reaches both the staff UI and machine clients.

## Operating Context

- Lookup flow: enter a 9–14 digit TIN. A cache hit returns immediately. A miss queues a Kafka job, and the UI polls `/org/{tin}/status` every 2 s for up to 60 s through queued → processing → ready | failed | not_found.
- The lookup page shows the most recently crawled TINs (from `/orgs`) as one-click repeat lookups.
- One search fills result tabs:
  - Registry (orginfo.uz, crawled);
  - Didox (instant, from `/didox/org/{tin}`);
  - Directory (Didox banks, regions and districts; no TIN needed).
- Results export to Excel (`org_<tin>.xlsx`). Founder names link to orginfo.uz founder search.
- Developers read the API Docs page (endpoints, curl and fetch examples, sample responses) and the Swagger UI at `/docs`.

## Capabilities and Constraints

- Every endpoint uses HTTP Basic Auth. The SPA stores the base64 token in localStorage and sends it on every request.
- TIN validation is `^\d{9,14}$`; anything else returns 422.
- Record fields come from the crawler: tin, name, legal_name, alternate_name, founding_date, status, registration_authority, thsht, dbibt, ifut, charter_fund, email, phone, address, director, founders[{name, share}].
- The UI ships in Uzbek (Latin script, the default) and English, with a switcher in the header. API Docs prose is translated; code, JSON, paths and field names stay as-is.
- Record fields also include director_position, large_taxpayer, data_as_of and source_url (orginfo.uz markup as of September 2026). The customs-warehouse block needs an orginfo login and is not crawled.
- Stack: React 19 SPA on Vite with shadcn/ui (Tailwind v4), served by Nginx in Docker, which proxies `/api/` to FastAPI.

## Brand Commitments

- The app is branded for Oziq-ovqat xavfsizligi qo‘mitasi (the food safety committee), using the committee's official seal (`frontend/public/logo.jpg`) as the logo and favicon.

## Evidence on Hand

- A real crawler fixture: `tests/fixtures/orginfo_detail.html`.
- No customer logos, metrics, or testimonials exist, and none should be invented.

## Product Principles

1. The answer comes first. The record is the product, and chrome must never slow down reading it.
2. Built for repeat use: recent TINs, keyboard-first entry, and zero friction on the 50th lookup of the day.
3. Honest state. Queued, processing, failed, and not-found are always visible and explained, never hidden behind a spinner.
4. One contract. The UI and the documented API show the same statuses and fields.
