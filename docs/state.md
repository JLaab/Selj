# Selj – State & Plan

Senast uppdaterad: (se commit/filändringstid)

## Målbild
- Webb: snabb marknadsplats (Next.js), län först i mobil, stabil scroll, list/grid, detaljvy med galleri och chat UI.
- Admin: moderering, kategorier/filter, skapa/hantera annonser, intäkts- och användarinsikter.
- Backend: BFF/API för listings, kategorier/filter, auth/roller, media-upload, sök (Typesense), messaging/notifications.
- Beslut (prod-stack): Frontend på Vercel, DB i Supabase (Postgres), sök i Typesense Cloud, media i Cloudflare R2 + CDN. Admin kan flyttas ut senare men samma backend.
- Splitbar: admin kan flyttas till egen app senare; delad kod/typer/tema.

## Vad som finns idag
- Webb UI: länval, list/grid, detaljvy, helskärms-galleri, sortering (senaste/pris), favoritknapp (mock).
- Formular: skapa annons (webb) med titel, pris, ort/län, kontakt (namn, e-post, telefon, webbplats), kategori, beskrivning, media-hint.
- Detaljvy: säljarinfo (privat/företag), pris, kontaktform, bildgalleri, listvy/rutvy. Attribut från kategori visas per annons.
- Admin UI: dashboard med nyckeltal, moderering (approve/reject/bulk), kategorilista, skapa annons (kopplad till kategoriregler), sidomeny, växlingsknapp till webbvyn.
- Kategoribuilder: separata fält för publicering (`createFields`) och sökfilter (`searchFilters`), snabbval och kopiering mellan sektionerna.
- Datahantering: file-backed mock (`data/db.json`) för listings/kategorier via API-routes, pluggbar `DataStore` (kan växla till Postgres via env). Typer i `src/lib/types.ts` och `packages/types`. Mockdata i `src/lib/mockData.ts` seedar vid första körning.
- Sök: inbyggd filtrering + pluggbar `searchProvider`. Typesense-stöd via env (index vid create/update, sök via `/api/search`).
- Teman/färger: ljus/“selj”-grön, förstärkta kort/badges.

## Nästa steg (prio)
1) Supabase + Typesense Cloud: sätt env `DATA_STORE=postgres` och `DATABASE_URL` (Supabase), peka search mot Typesense Cloud (env + schema), reindexera från DB vid deploy. Lägg migrations och backup-plan.
2) Media via Cloudflare R2: presigned upload-endpoint, lagra URL i DB, max 5 bilder + ev. 1 video. Publikt CDN-hostname.
3) Auth/roller: admin-gate nu, sedan riktig auth (NextAuth/Clerk/Supabase Auth) med roll “admin”.
4) Cache/perf: ISR/edge-cache för listningar, rate limiting, logg/metrics. Förbered för CDN runt media.
5) Stabil schema: versionera kategori/attributschema och lägg migrationsväg för framtida fält.

## Teknikkarta
- Frontend: Next.js 16 (app router), React, CSS modules. Turbopack dev/build.
- State/mock: `src/lib/mockStore` (in-memory), `mockData`, `types`.
- UI: ingen komponentlib; egen CSS. Teman via CSS-variabler (light/dark toggle finns).
- Admin: ligger i `apps/web/src/app/admin`. Web i `apps/web/src/app/page.tsx`.
- Images: Next Image med Unsplash remote pattern.

## Kör lokalt
```bash
cd apps/web
npm install
npm run dev
# Webb: http://localhost:3000
# Admin: http://localhost:3000/admin
```

## Separation/monorepo-plan
- Blueprint för delade paket finns i `packages/` (types/api mock), men web använder lokala `src/lib/*` pga turbopack-symlink-strul. När vi separerar:
  - Flytta admin till egen app/repo.
  - Publicera/peka på delade paket (typer/UI/API-klient).
  - Peka båda appar mot samma backend med rollbaserad auth.
  - Uppdatera env/URL per app.

## Öppna frågor / TODO
- Koppla formulär till kategori-filterregler och obligatoriska fält.
- Riktig auth/rollkontroll.
- Riktig media-upload och validering av filtyper/storlek.
- API-stub → riktig backend (Postgres/Typesense).
- Spara användarinfo (konto) i formulären när auth är på plats.
