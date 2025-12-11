import { NextResponse } from "next/server";
import { db } from "../_db";
import { searchProvider } from "../../../lib/searchProvider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const category = searchParams.get("category") || undefined;
  const county = searchParams.get("county") || undefined;
  const filtersParam = searchParams.get("filters");
  let filters: Record<string, string> = {};
  if (filtersParam) {
    try {
      filters = JSON.parse(filtersParam);
    } catch {
      // ignore bad filters payload
    }
  }

  const [listings, categories] = await Promise.all([db.getListings(), db.getCategories()]);
  const result = await searchProvider.search({
    q,
    category,
    county,
    filters,
    listings,
    categories,
  });
  return NextResponse.json(result);
}
