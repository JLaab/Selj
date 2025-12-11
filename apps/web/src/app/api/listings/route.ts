import { NextResponse } from "next/server";
import { db } from "../_db";
import type { Listing, ListingStatus } from "../../../lib/types";
import { getFieldsForCategory, validateAttributes } from "../../../lib/attributeHelpers";
import { searchProvider } from "../../../lib/searchProvider";

import { placeholderImage } from "../../../lib/placeholders";

export async function GET() {
  const lst = await db.getListings();
  return NextResponse.json(lst);
}

export async function POST(request: Request) {
  const body = await request.json();
  const categories = await db.getCategories();
  const createFields = body.category ? getFieldsForCategory(categories, body.category, "create") : [];
  const validationErrors = validateAttributes(createFields, body.attributes || {});
  if (!body.title || !body.price) {
    validationErrors.push("Titel och pris är obligatoriska");
  }
  if (validationErrors.length) {
    return NextResponse.json({ errors: validationErrors }, { status: 400 });
  }
  const now = new Date();
  const id = body.id || `${body.title.toLowerCase().replace(/\s+/g, "-")}-${now.getTime()}`;
  const listing: Listing = {
    id,
    title: body.title,
    price: body.price,
    priceValue: body.priceValue ?? null,
    description: body.description || "",
    images:
      Array.isArray(body.images) && body.images.length
        ? body.images
        : [placeholderImage],
    meta: body.meta || "",
    date: `${now.getDate()} ${now.toLocaleString("sv-SE", { month: "short" })}`,
    seller: body.seller || "Privat",
    status: body.status ?? "active",
    category: body.category,
    county: body.county || "Stockholm",
    city: body.city,
    sellerName: body.sellerName,
    sellerPhone: body.sellerPhone,
    sellerEmail: body.sellerEmail,
    sellerWebsite: body.sellerWebsite,
    attributes: body.attributes,
  };
  await db.createListing(listing);
  await searchProvider.indexListing(listing);
  return NextResponse.json(listing, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const id = body.id as string | undefined;
  const status = body.status as ListingStatus | undefined;
  if (!id || !status) {
    return NextResponse.json({ error: "id and status required" }, { status: 400 });
  }
  await db.updateListingStatus(id, status);
  // try to update search index if listing exists
  const listing = (await db.getListings()).find((l) => l.id === id);
  if (listing) {
    const updated = { ...listing, status };
    await searchProvider.indexListing(updated);
  }
  return NextResponse.json({ ok: true });
}
