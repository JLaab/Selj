import type { Category, Listing, ListingStatus } from "./types";
import { fileStore } from "./fileStore";

// Interface för olika datastores (file, Postgres, etc)
export interface DataStore {
  getListings(): Promise<Listing[]>;
  getCategories(): Promise<Category[]>;
  createListing(input: Listing): Promise<Listing>;
  updateListingStatus(id: string, status: ListingStatus): Promise<void>;
  createCategory(input: Category): Promise<Category>;
  updateCategory(value: string, input: Partial<Category>): Promise<Category | null>;
  deleteCategory(value: string): Promise<boolean>;
}

// Här kan vi växla till Postgres/Typesense-backed store via env
const selectedStore: DataStore = fileStore;

export const dataStore = selectedStore;
