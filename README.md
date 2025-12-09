# Selj

Marketplace challenger for Sweden with mobile-first UX, fast browsing, and a scalable backend so we can grow without rewrites.

## Core priorities
- Fast list browsing with preserved scroll position and stable pagination.
- Smooth mobile and desktop UX: county first on mobile, quick post-on-desktop.
- Search that tolerates typos and respects filters; good relevance from day one.
- Stateless, horizontally scalable services with clear async jobs for email, media, and moderation.
- Theme tokens (light/dark) set in one place and applied across web and future apps.

## Initial stack direction
- Frontend: Next.js (SSR/ISR, edge-ready). Virtualized lists for performance.
- Backend/BFF: Node (Fastify/Nest) as stateless services behind a load balancer.
- Database: Aurora Postgres Serverless v2 (multi-AZ) with JSONB for dynamic attributes; PostGIS optional.
- Search: Typesense from day one; fallback to Postgres full text + trigram if search is degraded.
- Messaging/async: SQS for indexing, email, media tasks, TTL expiration; SES for email.
- Cache: Redis (ElastiCache) for sessions, rate limit, and feature flags; turn on when auth/messages land.
- Media/CDN: S3 + CloudFront (or Cloudflare in front) with on-the-fly resize.
- Observability: CloudWatch logs/metrics; add tracing (X-Ray/OTel) later.

## Docs
- Architecture and search pipeline: docs/architecture.md
- Domain model and flows: docs/domain.md
- Roadmap and phases: docs/roadmap.md

## Operating notes
- Keep Postgres as source of truth; index to Typesense via SQS workers.
- Cursor-based pagination with stable sort `(created_at, id)`; store cursor + scroll offset in URL/state.
- Listings auto-expire after 90 days; background job sweeps and updates search index.
- Moderate flow: draft -> pending -> active -> expired/rejected.

## Köra lokalt (tidig skeleton)
- Starta Postgres + Typesense: `docker-compose up -d`.
- Web: `cd apps/web && npm run dev` (läs `.env.local.example`).
- API: `cd services/api && npm run dev` (läs `.env.example`).
- Frontend använder ännu statisk data; API har health och demo-endpoints för status/listings.
