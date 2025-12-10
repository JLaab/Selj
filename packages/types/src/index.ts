export type SaleType = "saljes" | "kopes";
export type ListingStatus = "draft" | "pending" | "active" | "rejected" | "expired";

export type FilterOption =
  | { type: "select"; label: string; options: string[]; ui?: "dropdown"; required?: boolean }
  | {
      type: "range";
      label: string;
      min: string;
      max: string;
      placeholder?: string;
      ui?: "slider" | "number";
      required?: boolean;
    }
  | { type: "chip"; label: string; options: string[]; ui?: "chip"; required?: boolean };

export interface Category {
  value: string;
  label: string;
  parentValue?: string;
  filters?: FilterOption[];
  createFields?: FilterOption[];
  searchFilters?: FilterOption[];
}

export interface Listing {
  id: string;
  title: string;
  price: string;
  priceValue: number | null;
  description?: string;
  images: string[];
  meta: string;
  date: string;
  seller: "Privat" | "Företag";
  status?: ListingStatus;
  county?: string;
  category?: string;
  sellerName?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerWebsite?: string;
  city?: string;
  attributes?: Record<string, string>;
}

export interface User {
  id: string;
  role: "admin" | "seller";
  name: string;
  email: string;
}
