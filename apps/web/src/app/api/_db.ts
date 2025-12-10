import type { Category, Listing, ListingStatus } from "../../lib/types";
import { mockCategories, mockListings } from "../../lib/mockData";

let listings: Listing[] = [...mockListings];
let categories: Category[] = mockCategories.map((c) => ({
  ...c,
  createFields: c.createFields ?? c.filters ?? [],
  searchFilters: c.searchFilters ?? c.filters ?? c.createFields ?? [],
  filters: c.filters ?? c.createFields ?? c.searchFilters ?? [],
}));

export const db = {
  getListings: (): Listing[] => listings,
  getCategories: (): Category[] => categories,
  createListing: (input: Listing) => {
    listings = [input, ...listings];
    return input;
  },
  updateListingStatus: (id: string, status: ListingStatus) => {
    listings = listings.map((l) => (l.id === id ? { ...l, status } : l));
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
    return categories.length !== before;
  },
};
