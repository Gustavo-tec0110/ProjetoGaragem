import type { ModificationCatalogItem } from "./types";
import type { ModificationCategoryRow } from "../types";

export function normalizeCatalogSearch(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Keep legacy rows available when editing; collapse aliases only when their target exists. */
export function selectableCatalog(catalog: ModificationCatalogItem[], selectedId = "") {
  const slugs = new Set(catalog.map((item) => item.slug));
  return catalog.filter((item) => item.id === selectedId || !item.selection_alias_of || !slugs.has(item.selection_alias_of));
}

export function filterCatalog(catalog: ModificationCatalogItem[], categories: ModificationCategoryRow[], categoryId: string, query: string) {
  const scope = new Set(categoryId ? [categoryId] : categories.map((category) => category.id));
  for (let changed = true; changed;) {
    changed = false;
    for (const category of categories) {
      if (category.parent_id && scope.has(category.parent_id) && !scope.has(category.id)) {
        scope.add(category.id);
        changed = true;
      }
    }
  }
  const tokens = normalizeCatalogSearch(query).split(" ").filter(Boolean);
  return catalog.filter((item) => {
    if (categoryId && !scope.has(item.category_id)) return false;
    const text = normalizeCatalogSearch([item.name, item.slug, item.short_description, item.category.name, item.search_terms].join(" "));
    return tokens.every((token) => text.includes(token));
  });
}
