## Selj web + admin (samma app, förberedd för split)

### Köra lokalt
```bash
cd apps/web
npm install
npm run dev
```
Öppna http://localhost:3000 för webben, http://localhost:3000/admin för admin-dashen.

### Struktur
- `src/app/page.tsx` – huvudsidan (marknadsplatsen).
- `src/app/admin` – adminvy (pending annonser, kategorier). Byggd att kunna flyttas ut.
- `src/lib/types.ts`, `src/lib/mockData.ts` – delad typ- och mockdata just nu. Blueprint för flytt till `packages/` när monorepo-strukturen ska aktiveras.
- `packages/` (root) innehåller samma material för framtida split (inte direkt importerat i webben just nu).
- `next.config.ts` har `externalDir: true` om vi börjar importera från `packages/`.

### När vi vill separera admin
1) Flytta `src/app/admin` till ett nytt Next-projekt (eller ny app i samma repo).
2) Ta med `packages/` eller publicera dem; importera samma paket i båda appar.
3) Peka båda appar på samma backend och införa riktig auth/rollkontroll.
4) Uppdatera env/URL:er och deployment-targets.

### Dummydata
Mockad data och stubbar ligger i `packages/api/src`. När backend kopplas på byter vi ut anropen i admin/web till riktiga API-klienter men kan behålla typerna och UI:t oförändrat.
