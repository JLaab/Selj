# Roadmap

## Phase 0: Foundation
- Repo setup, CI (lint/test/build), env configs for dev/stage/prod.
- Infra IaC (Terraform/CDK) for VPC, ALB, ECS Fargate services, Aurora Postgres Serverless, S3, CloudFront, SQS, SES, optional Redis.
- Auth scaffold (JWT), user service, county list, category schema service.
- Basic landing/list: county selector, create-listing form driven by schema, cursor pagination, scroll restore.
- Typesense small deployment + indexer worker hooked to SQS events; Postgres fallback wired.

## Phase 1: MVP (web)
- Create listing: draft/pending/active, upload images, required fields per category, 90-day expiry set.
- List/search: county filter, category/subcategory filters, text search with relevance; facets displayed; toggle saljes/kopes.
- Moderation queue (manual); admin endpoints to approve/reject.
- Messaging: threads per listing with text + image; polling/long-poll; email notifications via SES.
- Metrics for “mina sidor”: views/message counts per listing, days active.
- Theme tokens (light/dark) loaded from a single source; UI switches persisted.
- Basic rate limiting and bot protection (per-IP/user) on posting and messaging.

## Phase 2: Launch hardening
- Add Redis for sessions/rate limit/feature flags (if not enabled).
- Read replicas for Postgres (if needed); autoscale policies tuned; alarms/budgets set.
- CDN caching rules for list pages and media; ISR/etag validation paths.
- Nightly reindex and drift detection between Postgres and Typesense; DLQ reprocessing.
- Moderation tooling improvements (bulk actions, flags, simple rules/banned words).
- Error budgets and SLOs; tracing rolled out to key endpoints.

## Phase 3: Product depth (v1)
- WebSockets/SSE for live messaging and notifications (upgrade from polling).
- PostGIS/radius search if required; richer geo filters.
- Ratings flow (one per counterparty per listing) with display and reporting.
- Saved searches/alerts; email notifications for matches.
- Media optimization pipeline (AVIF/WebP, video thumbnails) if needed for cost/UX.
- Dashboard: taxonomy editor, theme editor, moderation console, basic stats.

## Toggles to defer cost
- Redis: enable when auth/messages need shared state/rate limits beyond in-process.
- PostGIS: enable when radius/geo ranking is needed.
- Image worker: add when CDN resize is insufficient for cost or quality.
- Typesense scaling: start small, add replicas or move to managed host when latency/CPU dictates.
