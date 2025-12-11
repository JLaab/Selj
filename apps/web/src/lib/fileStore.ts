import type { Category, Listing, ListingStatus } from "./types";
import { mockCategories, mockListings } from "./mockData";
import { promises as fs } from "fs";
import path from "path";
import type { DataStore } from "./dataStore";

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
    listings = [...mockListings];
    categories = mockCategories.map(normalizeCategory);
    await persist();
  }
};

export const fileStore: DataStore = {
  getListings: async () => {
    await load();
    return listings;
  },
  getCategories: async () => {
    await load();
    return categories;
  },
  createListing: async (input) => {
    await load();
    listings = [input, ...listings];
    void persist();
    return input;
  },
  updateListingStatus: async (id, status) => {
    await load();
    listings = listings.map((l) => (l.id === id ? { ...l, status } : l));
    void persist();
  },
  createCategory: async (input) => {
    await load();
    const normalized = normalizeCategory(input);
    const existingIdx = categories.findIndex((c) => c.value === input.value);
    if (existingIdx >= 0) {
      categories[existingIdx] = normalized;
    } else {
      categories = [...categories, normalized];
    }
    void persist();
    return normalized;
  },
  updateCategory: async (value, input) => {
    await load();
    const idx = categories.findIndex((c) => c.value === value);
    if (idx === -1) return null;
    const updated: Category = {
      ...categories[idx],
      ...input,
      createFields:
        input.createFields ?? categories[idx].createFields ?? categories[idx].filters ?? [],
      searchFilters:
        input.searchFilters ?? categories[idx].searchFilters ?? categories[idx].filters ?? [],
      filters: input.filters ?? input.createFields ?? input.searchFilters ?? categories[idx].filters,
      value: input.value ?? categories[idx].value,
    };
    categories[idx] = updated;
    void persist();
    return updated;
  },
  deleteCategory: async (value) => {
    await load();
    const before = categories.length;
    const toDelete = new Set<string>([value]);
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
