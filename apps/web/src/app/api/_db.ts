import type { Category, Listing, ListingStatus } from "../../lib/types";
import { mockCategories, mockListings } from "../../lib/mockData";
import { promises as fs } from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "db.json");

type DataShape = {
  listings: Listing[];
  categories: Category[];
};

let loaded = false;
let listings: Listing[] = [];
let categories: Category[] = [];

const normalizeCategory = (input: Category): Category => ({
  ...input,
  createFields: input.createFields ?? input.filters ?? [],
  searchFilters: input.searchFilters ?? input.filters ?? input.createFields ?? [],
  filters: input.filters ?? input.createFields ?? input.searchFilters ?? [],
});

const persist = async () => {
  try {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(
      dataFile,
      JSON.stringify(
        {
          listings,
          categories,
        } satisfies DataShape,
        null,
        2
      ),
      "utf-8"
    );
  } catch (err) {
    console.error("Could not persist data file", err);
  }
};

const load = async () => {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await fs.readFile(dataFile, "utf-8");
    const parsed = JSON.parse(raw) as DataShape;
    listings = parsed.listings ?? [];
    categories = (parsed.categories ?? []).map(normalizeCategory);
    return;
  } catch {
    // fall back to mock data
    listings = [...mockListings];
    categories = mockCategories.map(normalizeCategory);
    await persist();
  }
};

export const db = {
  getListings: async (): Promise<Listing[]> => {
    await load();
    return listings;
  },
  getCategories: async (): Promise<Category[]> => {
    await load();
    return categories;
  },
  createListing: (input: Listing) => {
    listings = [input, ...listings];
    void persist();
    return input;
  },
  updateListingStatus: (id: string, status: ListingStatus) => {
    listings = listings.map((l) => (l.id === id ? { ...l, status } : l));
    void persist();
  },
  createCategory: (input: Category) => {
    const normalized: Category = {
      ...input,
      createFields: input.createFields ?? input.filters ?? [],
      searchFilters: input.searchFilters ?? input.filters ?? input.createFields ?? [],
      filters: input.filters ?? input.createFields ?? input.searchFilters ?? [],
    };
    // overwrite if same value exists to keep idempotent for seeds
    const existingIdx = categories.findIndex((c) => c.value === input.value);
    if (existingIdx >= 0) {
      categories[existingIdx] = normalized;
    } else {
      categories = [...categories, normalized];
    }
    void persist();
    return normalized;
  },
  updateCategory: (value: string, input: Partial<Category>) => {
    const idx = categories.findIndex((c) => c.value === value);
    if (idx === -1) return null;
    const updated: Category = {
      ...categories[idx],
      ...input,
      createFields: input.createFields ?? categories[idx].createFields ?? categories[idx].filters ?? [],
      searchFilters:
        input.searchFilters ?? categories[idx].searchFilters ?? categories[idx].filters ?? [],
      filters: input.filters ?? input.createFields ?? input.searchFilters ?? categories[idx].filters,
      value: input.value ?? categories[idx].value,
    };
    categories[idx] = updated;
    void persist();
    return updated;
  },
  deleteCategory: (value: string) => {
    const before = categories.length;
    const toDelete = new Set<string>([value]);
    // cascade delete simple one-level children
    categories.forEach((c) => {
      if (c.parentValue && c.parentValue === value) {
        toDelete.add(c.value);
      }
    });
    categories = categories.filter((c) => !toDelete.has(c.value));
    void persist();
    return categories.length !== before;
  },
};
