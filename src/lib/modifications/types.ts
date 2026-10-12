import type {
  ModificationCatalogRow,
  ModificationCategoryRow,
  ProjectModificationRow,
} from "@/lib/types";

export type ModificationCatalogItem = ModificationCatalogRow & {
  category: ModificationCategoryRow;
};

export type ProjectModification = ProjectModificationRow & {
  catalog: ModificationCatalogItem;
};

export type ModificationPageData = {
  categories: ModificationCategoryRow[];
  catalog: ModificationCatalogItem[];
  modifications: ProjectModification[];
};
