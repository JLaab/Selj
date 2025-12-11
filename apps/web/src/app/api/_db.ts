import type { Category, Listing, ListingStatus } from "../../lib/types";
import { dataStore } from "../../lib/dataStore";

export const db = {
  getListings: (): Promise<Listing[]> => dataStore.getListings(),
  getCategories: (): Promise<Category[]> => dataStore.getCategories(),
  createListing: (input: Listing): Promise<Listing> => dataStore.createListing(input),
  updateListingStatus: (id: string, status: ListingStatus): Promise<void> =>
    dataStore.updateListingStatus(id, status),
  createCategory: (input: Category): Promise<Category> => dataStore.createCategory(input),
  updateCategory: (value: string, input: Partial<Category>): Promise<Category | null> =>
    dataStore.updateCategory(value, input),
  deleteCategory: (value: string): Promise<boolean> => dataStore.deleteCategory(value),
};
