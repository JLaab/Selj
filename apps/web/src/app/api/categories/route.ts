import { NextResponse } from "next/server";
import { db } from "../_db";
import type { Category, FilterOption } from "../../../lib/types";

const normalizeFilters = (
  raw: unknown,
  prefix: string
): { filters: FilterOption[]; errors: string[] } => {
  const errors: string[] = [];
  if (!Array.isArray(raw)) return { filters: [], errors };
  const filters: FilterOption[] = [];
  raw.forEach((item, idx) => {
    const label = typeof item?.label === "string" ? item.label.trim() : "";
    const required = Boolean(item?.required);
    if (item?.type === "select" || item?.type === "chip") {
      const options = Array.isArray(item.options)
        ? item.options.map((o: unknown) => String(o).trim()).filter(Boolean)
        : [];
      if (!label) errors.push(`${prefix} ${idx + 1}: label saknas`);
      if (options.length === 0) errors.push(`${prefix} ${label || idx + 1}: lägg till minst ett val`);
      if (label && options.length > 0) {
        filters.push({
          type: item.type,
          label,
          options,
          required,
          ui: item.type === "select" ? "dropdown" : "chip",
        });
      }
      return;
    }
    if (item?.type === "range") {
      const min = item.min !== undefined ? String(item.min) : "";
      const max = item.max !== undefined ? String(item.max) : "";
      const ui: FilterOption["ui"] = item.ui === "slider" ? "slider" : "number";
      if (!label) errors.push(`${prefix} ${idx + 1}: label saknas`);
      if (!min || !max) errors.push(`${prefix} ${label || idx + 1}: min och max krävs`);
      if (label && min && max) {
        filters.push({ type: "range", label, min, max, ui, required });
      }
      return;
    }
    if (item?.type) {
      errors.push(`${prefix} ${idx + 1}: okänd typ ${item.type}`);
    }
  });
  return { filters, errors };
};

export async function GET() {
  const cats = await db.getCategories();
  return NextResponse.json(cats);
}

export async function POST(request: Request) {
  const body = await request.json();
  const errors: string[] = [];
  const value = typeof body.value === "string" ? body.value.trim() : "";
  const label = typeof body.label === "string" ? body.label.trim() : "";
  const parentValue =
    typeof body.parentValue === "string" && body.parentValue.trim().length > 0
      ? body.parentValue.trim()
      : undefined;
  if (!value || !label) {
    errors.push("value och label krävs");
  }
  const { filters: createFields, errors: createErrors } = normalizeFilters(
    body.createFields ?? body.filters ?? [],
    "Publicera-fält"
  );
  const { filters: searchFilters, errors: searchErrors } = normalizeFilters(
    body.searchFilters ?? body.filters ?? body.createFields ?? [],
    "Sök-filter"
  );
  errors.push(...createErrors, ...searchErrors);
  const existingCats = await db.getCategories();
  if (existingCats.some((c) => c.value === value)) {
    errors.push("Kategori med samma value finns redan");
  }
  if (parentValue) {
    const parentExists = existingCats.some((c) => c.value === parentValue);
    if (!parentExists) errors.push("Förälderkategori finns inte");
    if (parentValue === value) errors.push("Kategori kan inte vara förälder till sig själv");
  }
  if (errors.length) {
    return NextResponse.json({ errors }, { status: 400 });
  }
  const newCat: Category = { value, label, parentValue, createFields, searchFilters };
  db.createCategory(newCat);
  return NextResponse.json(newCat, { status: 201 });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const value = typeof body.value === "string" ? body.value.trim() : "";
  if (!value) {
    return NextResponse.json({ errors: ["value krävs för att uppdatera"] }, { status: 400 });
  }
  const existingCats = await db.getCategories();
  const existing = existingCats.find((c) => c.value === value);
  if (!existing) {
    return NextResponse.json({ errors: ["Kategorin finns inte"] }, { status: 404 });
  }

  let createFields = existing.createFields ?? existing.filters ?? [];
  if (body.createFields !== undefined || body.filters !== undefined) {
    const { filters: normalized, errors } = normalizeFilters(
      body.createFields ?? body.filters ?? [],
      "Publicera-fält"
    );
    if (errors.length) return NextResponse.json({ errors }, { status: 400 });
    createFields = normalized;
  }

  let searchFilters = existing.searchFilters ?? existing.filters ?? existing.createFields ?? [];
  if (body.searchFilters !== undefined || body.filters !== undefined) {
    const { filters: normalized, errors } = normalizeFilters(
      body.searchFilters ?? body.filters ?? body.createFields ?? [],
      "Sök-filter"
    );
    if (errors.length) return NextResponse.json({ errors }, { status: 400 });
    searchFilters = normalized;
  }

  let parentValue = existing.parentValue;
  if (body.parentValue !== undefined) {
    if (typeof body.parentValue === "string" && body.parentValue.trim().length > 0) {
      parentValue = body.parentValue.trim();
      if (parentValue === value) {
        return NextResponse.json(
          { errors: ["Kategori kan inte vara förälder till sig själv"] },
          { status: 400 }
        );
      }
      const parentExists = existingCats.some((c) => c.value === parentValue);
      if (!parentExists) {
        return NextResponse.json({ errors: ["Förälderkategori finns inte"] }, { status: 400 });
      }
    } else {
      parentValue = undefined;
    }
  }
  const label =
    typeof body.label === "string" && body.label.trim().length > 0
      ? body.label.trim()
      : existing.label;
  const updated = db.updateCategory(value, { label, parentValue, createFields, searchFilters });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const value = typeof body.value === "string" ? body.value.trim() : "";
  if (!value) {
    return NextResponse.json({ errors: ["value krävs för delete"] }, { status: 400 });
  }
  const ok = db.deleteCategory(value);
  if (!ok) {
    return NextResponse.json({ errors: ["Kategorin hittades inte"] }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
