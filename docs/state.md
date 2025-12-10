# Selj – State & Plan

Senast uppdaterad: (se commit/filändringstid)

## Målbild
- Webb: snabb marknadsplats (Next.js), län först i mobil, stabil scroll, list/grid, detaljvy med galleri och chat UI.
- Admin: moderering, kategorier/filter, skapa/hantera annonser, intäkts- och användarinsikter.
- Backend: BFF/API för listings, kategorier/filter, auth/roller, media-upload, sök (Typesense), messaging/notifications.
- Splitbar: admin kan flyttas till egen app senare; delad kod/typer/tema.

## Vad som finns idag
- Webb UI: länval, list/grid, detaljvy, helskärms-galleri, sortering (senaste/pris), favoritknapp (mock).
- Formular: skapa annons (webb) med titel, pris, ort/län, kontakt (namn, e-post, telefon, webbplats), kategori, beskrivning, media-hint.
- Detaljvy: säljarinfo (privat/företag), pris, kontaktform, bildgalleri, listvy/rutvy.
- Admin UI: dashboard med nyckeltal, moderering (approve/reject/bulk), kategorilista, placeholders för blockerade konton/regler, skapa annons (lägger in i mockstore), sidomeny.
- Datahantering: enkel in-memory `mockStore` (delad mellan web och admin). Listings kan uppdateras och skapas i admin och syns på webben. Typer i `src/lib/types.ts`. Mockdata i `src/lib/mockData.ts`.
- Teman/färger: ljus/“selj”-grön, förstärkta kort/badges.

## Nästa steg (prio)
1) API-stub: Next app routes för `/api/listings` (GET/POST/PUT status) och `/api/categories` (GET). Web och admin hämtar via fetch/React Query istället för direkt mockstore. In-memory data kan ligga i en server-fil (t.ex. `src/server/mockDb.ts`).
2) Validering mot kategoriregler: generera formulärfält/obligatoriska fält baserat på kategori/filterdefinitioner; tillämpa i både web och admin.
3) Auth/roller (stub → riktig): admin-gate, sedan t.ex. NextAuth/Clerk/Supabase med roll “admin”.
4) Media-upload: koppla uppladdning (S3-presigned stub), ersätt “bild-URL”-fält med filuppladdning; fallback URL för mock.
5) Sök/Typesense: koppla frontendfilter till riktig sök när API/BFF finns.

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
