import type { Category, Listing, ListingStatus } from "./types";
import { fileStore } from "./fileStore";
import { pgStore } from "./pgStore";

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

// Här kan vi växla till Postgres-backed store via env. Default: fil.
const usePg = (process.env.DATA_STORE || "").toLowerCase() === "postgres" && process.env.DATABASE_URL;
const selectedStore: DataStore = usePg ? pgStore : fileStore;

export const dataStore = selectedStore;
