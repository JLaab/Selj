# Architecture

Purpose-built for fast browsing, good relevance, and growth-ready infra without overpaying early.

## High-level
- Client: Next.js (SSR/ISR). Hydrates with virtualized lists, stores `{cursor, scrollY}` in URL/history to restore position on back.
- BFF/API: Node (Fastify/Nest) stateless services behind ALB. Responsible for auth, listings, messaging, and search orchestration.
- Data: Aurora Postgres Serverless v2 (multi-AZ). JSONB for dynamic attributes; optional PostGIS for radius search.
- Search: Typesense as primary search, with fallback to Postgres full text + trigram.
- Cache: Redis (ElastiCache) for sessions, rate limit, feature flags; CDN caching for static and short TTL for list queries.
- Async: SQS for indexing, email notifications, media jobs, TTL expiration. DLQ + reindex jobs for resilience.
- Media: S3 storage + CloudFront (or Cloudflare) with on-the-fly resize. Optional image worker for heavier optimization later.
- Email: SES with DKIM/SPF set early.
- Observability: CloudWatch logs/metrics; add tracing (X-Ray/OTel) as traffic grows.

## Request paths
- Landing/listing pages: CDN -> Next SSR/ISR -> BFF -> Postgres/Typesense. Lists cached (short TTL) per county/category/query.
- Search: BFF calls Typesense with filter-first queries (county/status/category) plus text. Returns results + facets.
- Auth/session: JWT with optional Redis session store for revocation; rate limit via Redis.
- Messaging: API (initially polling/long-poll), later WebSockets/SSE. Email notifications via SES in background.

## Search pipeline
- Source of truth: Postgres.
- On listing create/update/delete/expire: write event to SQS queue.
- Indexer worker consumes events, upserts/deletes documents in Typesense. Errors go to DLQ; nightly reindex check compares counts/ids.
- TTL: 90-day expiry job updates status to expired and removes from Typesense.
- Schema: weighted fields (title high, attributes medium, description lower), facets on all filterable fields, decay boost on recency.
- Fallback: if Typesense is unavailable, BFF serves Postgres search with filters and signals “degraded search” to UI.

## Performance and resilience
- Pagination: cursor-based on `(created_at, id)`; stable sort prevents jumps. Cursor + scrollY stored in URL/history.
- List rendering: virtualized list to keep UI smooth with thousands of items.
- Caching: CDN for static; ISR/etag for pages; BFF-side caching of popular queries (30–60s). Redis optional later.
- Rate limiting: per-IP and per-user on posting, messaging, and auth; enforced via Redis or in-process token bucket early.
- Backpressure: SQS decouples indexing/email/media; autoscale workers on queue depth.
- Availability: multi-AZ Postgres; ALB across AZs; scale out ECS tasks on CPU/RPS. Add read replicas when read load grows.

## Feature toggles (cost control)
- Typesense: on from day one; size small, scale up when p95 latency or CPU exceeds targets.
- Redis: optional; can start without and enable when auth/messaging goes live.
- PostGIS: off initially; enable when radius search is needed.
- Image worker: off initially; rely on CDN resize until quality/cost requires dedicated optimization.
