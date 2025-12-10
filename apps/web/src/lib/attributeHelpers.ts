import type { Category, FilterOption } from "./types";

export function getFiltersForCategory(categories: Category[], value: string) {
  return categories.find((c) => c.value === value)?.filters ?? [];
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
