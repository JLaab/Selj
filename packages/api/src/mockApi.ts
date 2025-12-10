import { mockCategories, mockListings } from "./mockData";
import type { Category, Listing, ListingStatus } from "@selj/types";

const delay = (ms = 120) => new Promise((res) => setTimeout(res, ms));

export async function getCategories(): Promise<Category[]> {
  await delay();
  return mockCategories;
}

export async function getListings(): Promise<Listing[]> {
  await delay();
  return mockListings;
}

export async function getPendingListings(): Promise<Listing[]> {
  await delay();
  return mockListings.filter((l) => (l.status ?? "active") === "pending");
}

export async function updateListingStatus(
  id: string,
  status: ListingStatus
): Promise<{ ok: boolean }> {
  await delay();
  const idx = mockListings.findIndex((l) => l.id === id);
  if (idx >= 0) {
    mockListings[idx] = { ...mockListings[idx], status };
    return { ok: true };
  }
  return { ok: false };
}
