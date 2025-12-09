# Domain model and flows

## Entities
- User: id, email (verified), type (private/company), display name, rating aggregates, created_at, status.
- Listing: id, owner_id, county, category, subcategory, attributes (JSONB), title, description, price, media refs, status (draft/pending/active/expired/rejected), created_at, updated_at, expires_at.
- Category schema: admin-managed taxonomy that defines attributes, required fields, and filter types. Stored in DB and used by both create-form and search filters.
- Message: thread per listing and buyer/seller; supports text + image attachments; status (sent/delivered/read); timestamps.
- Attachment: id, listing_id/message_id, type (image/video), storage key, size, mime.
- Rating: id, from_user_id, to_user_id, listing_id, score, comment, created_at.
- Listing views: user_id/IP hash (for unique counts), listing_id, viewed_at.

## Listing lifecycle
- draft -> pending -> active -> expired (90 days) or rejected.
- Draft can be saved; pending enters moderation queue; active is searchable and visible; expired still accessible via direct link but hidden from lists/search.
- TTL job updates status to expired and removes from search index.
- Edit: if material changes, status may return to pending; otherwise keep active and reindex.

## Category and attributes
- Taxonomy drives both create-form and search filters. Each attribute stores type (enum/text/number/bool), required flag, min/max (for ranges), allowed values.
- When schema changes: version bump, UI refreshes form/filter definitions; reindex affected listings (batch).
- Example: category vehicle -> subcategory car -> attributes: mileage (number range), year (number range), fuel (enum), gearbox (enum).

## Search and indexing flow
- Write listing to Postgres.
- Emit event to SQS (create/update/delete/expire).
- Indexer worker upserts or deletes in Typesense; facets include county/category/subcategory and all filterable attributes.
- Boost rules: title highest weight, attributes medium, description lower; recency decay applied.
- Fallback search: Postgres full text + trigram when Typesense is unavailable.

## Messaging flow
- Thread per listing between interested party and seller (no distinction buyer/seller roles).
- API writes message row; attachments stored in S3; virus scan job optional later.
- Notification: enqueue email job (SES) to recipients; in-app polling/long-poll initially, WebSockets/SSE later.
- Read receipts: mark read timestamp per participant; throttle notifications to avoid spam.

## Ratings
- One rating per counterparty per listing (or enforce cooldown). Aggregate rating on user for display and sort.
- Optional moderation on ratings; store flag reason and reviewer id.

## Metrics for “mina sidor”
- Views per listing (unique per user/IP per time window).
- Message counts per listing.
- Days active (created_at to now or to expired_at), show remaining days until expiry.

## Moderation
- Queue sourced from pending listings and flagged content.
- Status transitions require audit trail (who approved/rejected, why).
- Optional automated checks: banned words, image scan, rate limit per user/IP.
