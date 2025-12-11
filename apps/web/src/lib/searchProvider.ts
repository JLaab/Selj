import type { Category, Listing, ListingStatus } from "./types";
import { getFieldsForCategory } from "./attributeHelpers";

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

// Placeholder: future Typesense/Elastic provider can be plugged in här
const useExternalSearch =
  (process.env.SEARCH_PROVIDER || "").toLowerCase() === "typesense" &&
  process.env.TYPESENSE_API_KEY &&
  process.env.TYPESENSE_HOST;

// For now, fallback to file search; when we wire Typesense, replace this block.
const selectedSearchProvider: SearchProvider = fileSearchProvider;

export const searchProvider = selectedSearchProvider;
