import type { Category, Listing, ListingStatus } from "../../lib/types";
import { mockCategories, mockListings } from "../../lib/mockData";

let listings: Listing[] = [...mockListings];
let categories: Category[] = [...mockCategories];

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
    // overwrite if same value exists to keep idempotent for seeds
    const existingIdx = categories.findIndex((c) => c.value === input.value);
    if (existingIdx >= 0) {
      categories[existingIdx] = input;
    } else {
      categories = [...categories, input];
    }
    return input;
  },
  updateCategory: (value: string, input: Partial<Category>) => {
    const idx = categories.findIndex((c) => c.value === value);
    if (idx === -1) return null;
    const updated: Category = {
      ...categories[idx],
      ...input,
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
