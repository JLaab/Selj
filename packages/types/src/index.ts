export type SaleType = "saljes" | "kopes";
export type ListingStatus = "draft" | "pending" | "active" | "rejected" | "expired";

export type FilterOption =
  | { type: "select"; label: string; options: string[] }
  | { type: "range"; label: string; min: string; max: string; placeholder?: string }
  | { type: "chip"; label: string; options: string[] };

export interface Category {
  value: string;
  label: string;
  filters: FilterOption[];
}

export interface Listing {
  id: string;
  title: string;
  price: string;
  priceValue: number | null;
  images: string[];
  meta: string;
  date: string;
  seller: "Privat" | "Företag";
  status?: ListingStatus;
  county?: string;
  category?: string;
}

export interface User {
  id: string;
  role: "admin" | "seller";
  name: string;
  email: string;
}
