import type { Category, Listing, ListingStatus } from "./types";
import { getFieldsForCategory } from "./attributeHelpers";
import Typesense from "typesense";

type SearchParams = {
  q?: string;
  category?: string;
  county?: string;
  filters?: Record<string, string>;
  categories: Category[];
  listings: Listing[];
};

export interface SearchProvider {
  indexListing(listing: Listing): Promise<void>;
  deleteListing(id: string): Promise<void>;
  updateStatus(id: string, status: ListingStatus): Promise<void>;
  search(params: SearchParams): Promise<{ hits: Listing[]; total: number }>;
}

const fileSearchProvider: SearchProvider = {
  async indexListing() {
    // no-op for in-memory search
  },
  async deleteListing() {
    // no-op
  },
  async updateStatus() {
    // no-op
  },
  async search({ q = "", category, county, filters = {}, categories, listings }) {
    const query = q.toLowerCase().trim();
    const allowedFields =
      category && getFieldsForCategory(categories, category, "search").map((f) => f.label);
    const hits = listings.filter((l) => {
      if (category && l.category !== category) return false;
      if (county && l.county !== county) return false;

      if (query) {
        const haystack = `${l.title} ${l.meta || ""} ${l.description || ""} ${l.sellerName || ""}`.toLowerCase();
        if (!haystack.includes(query)) return false;
      }

      for (const [key, val] of Object.entries(filters)) {
        if (!val) continue;
        if (allowedFields && !allowedFields.includes(key)) continue;
        const attr = l.attributes || {};
        if (key.endsWith("-min")) {
          const base = key.replace(/-min$/, "");
          const target = Number(attr[base] || attr[key]);
          if (Number.isFinite(target) && target < Number(val)) return false;
        } else if (key.endsWith("-max")) {
          const base = key.replace(/-max$/, "");
          const target = Number(attr[base] || attr[key]);
          if (Number.isFinite(target) && target > Number(val)) return false;
        } else {
          if ((attr[key] || "").toString() !== val.toString()) return false;
        }
      }
      return true;
    });

    return { hits, total: hits.length };
  },
};

const typesenseClient =
  process.env.TYPESENSE_API_KEY && process.env.TYPESENSE_HOST
    ? new Typesense.Client({
        apiKey: process.env.TYPESENSE_API_KEY,
        nodes: [
          {
            host: process.env.TYPESENSE_HOST.replace(/^https?:\/\//, ""),
            port: Number(process.env.TYPESENSE_PORT || 443),
            protocol: process.env.TYPESENSE_PROTOCOL || "https",
          },
        ],
        connectionTimeoutSeconds: 3,
      })
    : null;

const TS_COLLECTION = "listings";

const ensureTypesenseSchema = async () => {
  if (!typesenseClient) return;
  try {
    await typesenseClient.collections(TS_COLLECTION).retrieve();
  } catch {
    await typesenseClient.collections().create({
      name: TS_COLLECTION,
      fields: [
        { name: "id", type: "string" },
        { name: "title", type: "string" },
        { name: "meta", type: "string", optional: true },
        { name: "description", type: "string", optional: true },
        { name: "category", type: "string", facet: true },
        { name: "county", type: "string", facet: true },
        { name: "seller", type: "string", facet: true },
        { name: "status", type: "string", facet: true },
        { name: "price_value", type: "float", optional: true },
        // raw_listing lagrar hela dokumentet för enkel återanvändning
        { name: "raw_listing", type: "string" },
      ],
      default_sorting_field: "price_value",
    });
  }
};

const listingToDoc = (listing: Listing) => ({
  id: listing.id,
  title: listing.title,
  meta: listing.meta ?? "",
  description: listing.description ?? "",
  category: listing.category ?? "",
  county: listing.county ?? "",
  seller: listing.seller ?? "Privat",
  status: listing.status ?? "active",
  price_value: listing.priceValue ?? 0,
  raw_listing: JSON.stringify(listing),
});

const bulkIndexListings = async (items: Listing[]) => {
  if (!typesenseClient || !items.length) return;
  await ensureTypesenseSchema();
  const payload = items.map((l) => JSON.stringify(listingToDoc(l))).join("\n");
  await typesenseClient
    .collections(TS_COLLECTION)
    .documents()
    .import(payload, { action: "upsert" });
};

const typesenseProvider: SearchProvider = {
  async indexListing(listing) {
    if (!typesenseClient) return;
    await ensureTypesenseSchema();
    await typesenseClient.collections(TS_COLLECTION).documents().upsert(listingToDoc(listing));
  },
  async deleteListing(id) {
    if (!typesenseClient) return;
    await ensureTypesenseSchema();
    try {
      await typesenseClient.collections(TS_COLLECTION).documents(id).delete();
    } catch {
      // ignore missing
    }
  },
  async updateStatus(id, status) {
    if (!typesenseClient) return;
    await ensureTypesenseSchema();
    try {
      await typesenseClient.collections(TS_COLLECTION).documents(id).update({ status });
    } catch {
      // ignore missing
    }
  },
  async search({ q = "", category, county, filters = {}, categories, listings }) {
    if (!typesenseClient) {
      return fileSearchProvider.search({ q, category, county, filters, categories, listings });
    }
    await ensureTypesenseSchema();
    const query = q || "*";
    const filterClauses: string[] = [];
    if (category) filterClauses.push(`category:=${category}`);
    if (county) filterClauses.push(`county:=${county}`);
    if (filters.status) filterClauses.push(`status:=${filters.status}`);

    const runSearch = async () =>
      typesenseClient.collections(TS_COLLECTION).documents().search({
        q: query,
        query_by: "title,meta,description",
        filter_by: filterClauses.join(" && "),
        per_page: 200,
      });
    let searchRes;
    try {
      searchRes = await runSearch();
    } catch (err) {
      console.warn("Typesense search fail, falling back to file search", err);
      return fileSearchProvider.search({ q, category, county, filters, categories, listings });
    }

    // Om indexet är tomt (t.ex. Typesense omstart) och vi har lokala annonser: reindexera snabbt
    const noFilters =
      !q &&
      !category &&
      !county &&
      Object.entries(filters || {}).filter(([, v]) => !!v).length === 0;
    if ((searchRes.found ?? 0) === 0 && listings.length && noFilters) {
      await bulkIndexListings(listings);
      searchRes = await runSearch();
    }

    // plocka upp rå-datan och komplettera med attributfilter i minnet (flexibelt för dynamiska fält)
    const allowedFields =
      category && getFieldsForCategory(categories, category, "search").map((f) => f.label);
    const rawHits: Listing[] = (searchRes.hits || [])
      .map((hit: any) => {
        try {
          return JSON.parse(hit.document.raw_listing) as Listing;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as Listing[];

    const filtered = rawHits.filter((l) => {
      for (const [key, val] of Object.entries(filters)) {
        if (!val || key === "status") continue;
        if (allowedFields && !allowedFields.includes(key)) continue;
        const attr = l.attributes || {};
        if (key.endsWith("-min")) {
          const base = key.replace(/-min$/, "");
          const target = Number(attr[base] || attr[key]);
          if (Number.isFinite(target) && target < Number(val)) return false;
        } else if (key.endsWith("-max")) {
          const base = key.replace(/-max$/, "");
          const target = Number(attr[base] || attr[key]);
          if (Number.isFinite(target) && target > Number(val)) return false;
        } else {
          if ((attr[key] || "").toString() !== val.toString()) return false;
        }
      }
      return true;
    });

    // Fallback om indexet inte innehåller några träffar (t.ex. om Typesense är tomt eller nystartad)
    if (filtered.length === 0 && listings.length) {
      return fileSearchProvider.search({ q, category, county, filters, categories, listings });
    }

    return { hits: filtered, total: filtered.length };
  },
};

const useTypesense =
  (process.env.SEARCH_PROVIDER || "").toLowerCase() === "typesense" &&
  !!process.env.TYPESENSE_API_KEY &&
  !!process.env.TYPESENSE_HOST;

const selectedSearchProvider: SearchProvider = useTypesense ? typesenseProvider : fileSearchProvider;

export const searchProvider = selectedSearchProvider;
