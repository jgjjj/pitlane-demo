# Implementation plan — Pitlane Booking

The original Figma board and the referenced plan file were not available in the workspace during implementation. This document is the executable reconstruction of the eight requested stages from the product brief; it is kept in the repository so later work has a checked-in source of truth.

## Stage 1 — foundation

React 19, strict TypeScript, Vite, Router, Query, Zod, shadcn/ui, Tailwind v4 and PWA injectManifest. One static build, `@/*` alias, semantic tokens and tenant-aware routing.

**Check:** `npm run build`, `npm run lint`.

## Stage 2 — tenant pipeline

`public/tenants/<slug>/business.json` and assets are source inputs. `tenant:new`, `tenant:validate`, `tenant:publish`, and `tenant:verify` create static deep-link shell metadata and manifests without overwriting other tenants.

**Check:** validate and verify both demo tenants; inspect generated `/s/<slug>/` files.

## Stage 3 — Supabase schema

Tenants, memberships, services, resources, hours, exceptions, bookings, one `resource_occupancies` table, payments, statistics, push subscriptions, usage counters and notification outbox. Composite tenant foreign keys and RLS are mandatory.

**Check:** `supabase db reset`; pgTAP contract and integration scenarios.

## Stage 4 — atomic booking

The database owns tenant, price, duration and resource allocation. PostgreSQL EXCLUDE protects continuous ranges including buffer and multi-day spans. Create, reschedule and cancel are SQL transactions; idempotency reissues the same access token from a high-entropy retry key.

**Check:** concurrent booking, two resources, multi-day occupancy, block conflict, reschedule rollback, cancel and idempotent retry.

## Stage 5 — auth and owner UI

Customers do not register. Access tokens are never stored in plaintext. Owners use Supabase Auth and server membership checks; public owner signup is absent. Owner UI separates overview, calendar, services and settings.

**Check:** anonymous customer booking; member/non-member RLS; no PII/token/payment access through anon.

## Stage 6 — AI and statistics

Owner-only AI uses server-side LLM settings and a bounded tool loop. Schedule questions always query server facts first. SQL statistics separate arrivals, completed orders and paid payments; the same tenant timezone and period are used in UI and AI.

**Check:** tool scope, JSON intent fallback, LLM request/token budget, unavailable-AI fallback, statistics isolation.

## Stage 7 — PWA and notifications

Per-tenant manifest metadata, icon references, deep-link shell and named tenant cache. VAPID push is opt-in and truthful; Cron leases outbox jobs with dedupe. ICS is an additional downloadable channel.

**Check:** manifest/deep-link validation for `/s/<slug>/`, `/book` and `/owner`, service-worker cache scope, push with VAPID, lease recovery, dedupe and ICS output.

## Stage 8 — release

Cloudflare Pages static build, Supabase secrets/functions/cron documentation, Playwright customer-to-owner flow and acceptance record. Preview is visibly demo-only; live activation requires verified settings.

**Check:** build, unit tests, Playwright, SQL integration tests, device standalone checks when devices are available.
