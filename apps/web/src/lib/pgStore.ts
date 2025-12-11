import { Pool } from "pg";
import type { Category, Listing, ListingStatus } from "./types";
import type { DataStore } from "./dataStore";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_SIZE || 10),
});

const normalizeCategory = (input: Category): Category => ({
  ...input,
  createFields: input.createFields ?? input.filters ?? [],
  searchFilters: input.searchFilters ?? input.filters ?? input.createFields ?? [],
  filters: input.filters ?? input.createFields ?? input.searchFilters ?? [],
});

let schemaReady = false;
const ensureSchema = async () => {
  if (schemaReady) return;
  schemaReady = true;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      value TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      parent_value TEXT,
      create_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
      search_filters JSONB NOT NULL DEFAULT '[]'::jsonb
    );
    CREATE TABLE IF NOT EXISTS listings (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      price TEXT NOT NULL,
      price_value NUMERIC NULL,
      description TEXT,
      images JSONB NOT NULL DEFAULT '[]'::jsonb,
      meta TEXT,
      date TEXT,
      seller TEXT,
      status TEXT,
      county TEXT,
      category TEXT,
      seller_name TEXT,
      seller_phone TEXT,
      seller_email TEXT,
      seller_website TEXT,
      city TEXT,
      attributes JSONB
    );
  `);
};

const rowToCategory = (row: any): Category =>
  normalizeCategory({
    value: row.value,
    label: row.label,
    parentValue: row.parent_value ?? undefined,
    createFields: row.create_fields ?? [],
    searchFilters: row.search_filters ?? [],
  });

const rowToListing = (row: any): Listing => ({
  id: row.id,
  title: row.title,
  price: row.price,
  priceValue: row.price_value === null ? null : Number(row.price_value),
  description: row.description ?? undefined,
  images: Array.isArray(row.images) ? row.images : [],
  meta: row.meta ?? "",
  date: row.date ?? "",
  seller: (row.seller as Listing["seller"]) || "Privat",
  status: row.status as ListingStatus | undefined,
  county: row.county ?? undefined,
  category: row.category ?? undefined,
  sellerName: row.seller_name ?? undefined,
  sellerPhone: row.seller_phone ?? undefined,
  sellerEmail: row.seller_email ?? undefined,
  sellerWebsite: row.seller_website ?? undefined,
  city: row.city ?? undefined,
  attributes: row.attributes ?? undefined,
});

export const pgStore: DataStore = {
  getListings: async () => {
    await ensureSchema();
    const res = await pool.query("SELECT * FROM listings ORDER BY date DESC, id DESC");
    return res.rows.map(rowToListing);
  },
  getCategories: async () => {
    await ensureSchema();
    const res = await pool.query("SELECT * FROM categories ORDER BY value ASC");
    return res.rows.map(rowToCategory);
  },
  createListing: async (input) => {
    await ensureSchema();
    await pool.query(
      `
      INSERT INTO listings
        (id, title, price, price_value, description, images, meta, date, seller, status, county, category, seller_name, seller_phone, seller_email, seller_website, city, attributes)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      ON CONFLICT (id) DO UPDATE SET
        title=EXCLUDED.title, price=EXCLUDED.price, price_value=EXCLUDED.price_value, description=EXCLUDED.description,
        images=EXCLUDED.images, meta=EXCLUDED.meta, date=EXCLUDED.date, seller=EXCLUDED.seller, status=EXCLUDED.status,
        county=EXCLUDED.county, category=EXCLUDED.category, seller_name=EXCLUDED.seller_name, seller_phone=EXCLUDED.seller_phone,
        seller_email=EXCLUDED.seller_email, seller_website=EXCLUDED.seller_website, city=EXCLUDED.city, attributes=EXCLUDED.attributes
      `,
      [
        input.id,
        input.title,
        input.price,
        input.priceValue,
        input.description ?? null,
        JSON.stringify(input.images ?? []),
        input.meta ?? null,
        input.date ?? null,
        input.seller,
        input.status ?? null,
        input.county ?? null,
        input.category ?? null,
        input.sellerName ?? null,
        input.sellerPhone ?? null,
        input.sellerEmail ?? null,
        input.sellerWebsite ?? null,
        input.city ?? null,
        input.attributes ? JSON.stringify(input.attributes) : null,
      ]
    );
    return input;
  },
  updateListingStatus: async (id, status) => {
    await ensureSchema();
    await pool.query("UPDATE listings SET status=$1 WHERE id=$2", [status, id]);
  },
  createCategory: async (input) => {
    await ensureSchema();
    const normalized = normalizeCategory(input);
    await pool.query(
      `
      INSERT INTO categories (value, label, parent_value, create_fields, search_filters)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (value) DO UPDATE SET
        label=EXCLUDED.label,
        parent_value=EXCLUDED.parent_value,
        create_fields=EXCLUDED.create_fields,
        search_filters=EXCLUDED.search_filters
      `,
      [
        normalized.value,
        normalized.label,
        normalized.parentValue ?? null,
        JSON.stringify(normalized.createFields ?? []),
        JSON.stringify(normalized.searchFilters ?? []),
      ]
    );
    return normalized;
  },
  updateCategory: async (value, input) => {
    await ensureSchema();
    const currentRes = await pool.query("SELECT * FROM categories WHERE value=$1", [value]);
    if (currentRes.rows.length === 0) return null;
    const current = rowToCategory(currentRes.rows[0]);
    const next: Category = {
      ...current,
      ...input,
      createFields: input.createFields ?? current.createFields ?? current.filters ?? [],
      searchFilters: input.searchFilters ?? current.searchFilters ?? current.filters ?? [],
      filters: input.filters ?? input.createFields ?? input.searchFilters ?? current.filters ?? [],
      value: input.value ?? current.value,
    };
    await pool.query(
      `
      UPDATE categories
      SET label=$2, parent_value=$3, create_fields=$4, search_filters=$5
      WHERE value=$1
      `,
      [
        value,
        next.label,
        next.parentValue ?? null,
        JSON.stringify(next.createFields ?? []),
        JSON.stringify(next.searchFilters ?? []),
      ]
    );
    return next;
  },
  deleteCategory: async (value) => {
    await ensureSchema();
    const res = await pool.query(
      "DELETE FROM categories WHERE value=$1 OR parent_value=$1",
      [value]
    );
    return res.rowCount > 0;
  },
};
