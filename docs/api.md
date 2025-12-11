# Selj – API översikt (mock/BFF)

Detta är en minimal dokumentation av de Next.js app routes som finns i mock-BFF:en. Syfte: kunna testa och integrera snabbt tills riktig backend ersätter dessa endpoints. Payloads är JSON och använder typerna i `apps/web/src/lib/types.ts` (samt `packages/types`).

## Grund
- Bas: samma domän som webben (ex. `http://localhost:3000`).
- Autentisering: ingen (mock). Byt till token/roll senare.
- Content-Type: `application/json` på POST/PUT/DELETE.

## Kategorier

### GET /api/categories
- Respons: `Category[]`
- Fält i `Category`:
  - `value` (slug), `label`, valfritt `parentValue`
  - `createFields`: fält för publiceringsformulär.
  - `searchFilters`: fält för sökfilter.
  - `filters`: legacy, fallback om ovan saknas.
- Retur är persisterad i `data/db.json` (file-backed mock).

### POST /api/categories
- Body:
```json
{
  "value": "fordon",
  "label": "Fordon",
  "parentValue": "optional-slug",
  "createFields": [ /* FilterOption[] */ ],
  "searchFilters": [ /* FilterOption[] */ ]
}
```
- Regler: `value` och `label` krävs; `parentValue` måste finnas om satt; filter valideras (label, options/min/max).
- Respons: skapad `Category`.

### PUT /api/categories
- Body: samma som POST men `value` krävs för att hitta befintlig kategori. Fält som saknas behåller befintliga värden.
- Respons: uppdaterad `Category`.

### DELETE /api/categories
- Body: `{ "value": "fordon" }`
- Raderar kategori + direkta underkategorier.

## Listings

### GET /api/listings
- Respons: `Listing[]` (persist i `data/db.json`).

### POST /api/listings
- Body (exempel):
```json
{
  "title": "Volvo V70 2016",
  "price": "160 000 kr",
  "priceValue": 160000,
  "category": "fordon",
  "description": "Text",
  "meta": "Kortinfo",
  "images": ["https://…"],
  "seller": "Privat",
  "sellerName": "Alex",
  "sellerPhone": "0701234567",
  "sellerEmail": "alex@example.com",
  "sellerWebsite": "https://example.com",
  "county": "Stockholm",
  "city": "Stockholm",
  "status": "pending",
  "attributes": { "Miltal": "10000", "Årsmodell": "2016" }
}
```
- Validering: kontrollerar obligatoriska `createFields` för vald kategori via `attributes` samt titel/pris.
- Fallbacks: om inga bilder skickas används placeholder-bild.
- Respons: skapad `Listing`.

### PUT /api/listings
- Body: `{ "id": "listing-id", "status": "active" | "pending" | "rejected" | "expired" }`
- Uppdaterar status.

## Typer (FilterOption)
- `select`: `{ "type": "select", "label": "Underkategori", "options": ["Bilar", "MC"], "required": true, "ui": "dropdown" }`
- `chip`: `{ "type": "chip", "label": "Drivmedel", "options": ["Bensin","Diesel"], "required": false, "ui": "chip" }`
- `range`: `{ "type": "range", "label": "Miltal", "min": "0", "max": "30000", "ui": "slider" | "number", "required": false }`

## Persistens (mock)
- Data skrivs till `data/db.json` automatiskt. Inledande data seedas från `apps/web/src/lib/mockData.ts` om filen saknas.
- Byt enkelt till Postgres/Typesense senare genom att ersätta `apps/web/src/app/api/_db.ts` med DB-implementation som uppfyller samma kontrakt.
