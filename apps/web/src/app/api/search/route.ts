import { NextResponse } from "next/server";
import { db } from "../_db";
import { getFieldsForCategory } from "../../../lib/attributeHelpers";

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
  const allowedFields =
    category && getFieldsForCategory(categories, category, "search").map((f) => f.label);

  const hits = listings.filter((l) => {
    if (category && l.category !== category) return false;
    if (county && l.county !== county) return false;

    // text match
    if (q) {
      const haystack = `${l.title} ${l.meta || ""} ${l.description || ""} ${l.sellerName || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    // attribute filters
    for (const [key, val] of Object.entries(filters)) {
      if (!val) continue;
      if (allowedFields && !allowedFields.includes(key)) continue;
      const attr = l.attributes || {};
      if (key.endsWith("-min")) {
        const base = key.replace(/-min$/, "");
        const target = Number(attr[base] || attr[key]);
        if (Number.isFinite(target) && target < Number(val)) return false;
      } else if (key.endsWith("-max")) {
        const base = key.replace(/-max$/, "");
        const target = Number(attr[base] || attr[key]);
        if (Number.isFinite(target) && target > Number(val)) return false;
      } else {
        if ((attr[key] || "").toString() !== val.toString()) return false;
      }
    }
    return true;
  });

  return NextResponse.json({ hits, total: hits.length });
}
