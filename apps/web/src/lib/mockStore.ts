import type { Category, Listing, ListingStatus } from "./types";
import { mockCategories, mockListings } from "./mockData";

type Listener = () => void;

let listings: Listing[] = [...mockListings];
let categories: Category[] = [...mockCategories];
const listeners: Set<Listener> = new Set();

const emit = () => {
  listeners.forEach((fn) => fn());
};

export const mockStore = {
  getListings: () => listings,
  getCategories: () => categories,
  subscribe: (fn: Listener) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
  updateListingStatus: (id: string, status: ListingStatus) => {
    listings = listings.map((l) => (l.id === id ? { ...l, status } : l));
    emit();
  },
  addListing: (
    input: Partial<Listing> & {
      title: string;
      price: string;
      category?: string;
      sellerName?: string;
      sellerPhone?: string;
      sellerEmail?: string;
      sellerWebsite?: string;
      county?: string;
      city?: string;
    }
  ) => {
    const now = new Date();
    const id = input.id || input.title.toLowerCase().replace(/\s+/g, "-") + "-" + now.getTime();
    const newListing: Listing = {
      id,
      title: input.title,
      price: input.price,
      priceValue: input.priceValue ?? null,
      description: input.description || "",
      images:
        input.images && input.images.length > 0
          ? input.images
          : [
              "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=800&q=80",
            ],
      meta: input.meta || "",
      date: `${now.getDate()} ${now.toLocaleString("sv-SE", { month: "short" })}`,
      seller: input.seller || "Privat",
      status: input.status ?? "active",
      category: input.category,
      county: input.county || "Stockholm",
      city: input.city,
      sellerName: input.sellerName,
      sellerPhone: input.sellerPhone,
      sellerEmail: input.sellerEmail,
      sellerWebsite: input.sellerWebsite,
      attributes: input.attributes,
    };
    listings = [newListing, ...listings];
    emit();
    return newListing;
  },
};
