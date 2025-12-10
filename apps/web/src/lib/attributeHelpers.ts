import type { Category, FilterOption } from "./types";

export function getFieldsForCategory(
  categories: Category[],
  value: string,
  kind: "create" | "search" = "create"
) {
  const cat = categories.find((c) => c.value === value);
  if (!cat) return [];
  if (kind === "search") return cat.searchFilters ?? cat.filters ?? cat.createFields ?? [];
  return cat.createFields ?? cat.filters ?? cat.searchFilters ?? [];
}

export function validateAttributes(filters: FilterOption[], attributes: Record<string, string>) {
  const errors: string[] = [];
  filters.forEach((f) => {
    if (f.required) {
      if (f.type === "range") {
        const min = attributes[`${f.label}-min`] || attributes[f.label];
        const max = attributes[`${f.label}-max`];
        if (!min && !max) {
          errors.push(`${f.label} saknas`);
        }
      } else if (!attributes[f.label]) {
        errors.push(`${f.label} saknas`);
      }
    }
  });
  return errors;
}
