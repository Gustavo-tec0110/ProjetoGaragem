"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Build } from "@/lib/types";

export type SavedBuild = {
  id: string;
  title: string;
  createdAt: string;
  build: Build;
};

type BuildsState = {
  builds: Record<string, SavedBuild>;
  order: string[];
  saveBuild: (input: { build: Build; title: string }) => void;
  removeBuild: (id: string) => void;
  clearBuilds: () => void;
};

export const useBuildsStore = create<BuildsState>()(
  persist(
    (set) => ({
      builds: {},
      order: [],
      saveBuild: ({ build, title }) =>
        set((state) => {
          const saved: SavedBuild = {
            id: build.id,
            title,
            createdAt: new Date().toISOString(),
            build,
          };

          const nextOrder = [build.id, ...state.order.filter((id) => id !== build.id)];
          return {
            builds: { ...state.builds, [build.id]: saved },
            order: nextOrder,
          };
        }),
      removeBuild: (id) =>
        set((state) => {
          const rest = { ...state.builds };
          delete rest[id];
          return {
            builds: rest,
            order: state.order.filter((item) => item !== id),
          };
        }),
      clearBuilds: () => set({ builds: {}, order: [] }),
    }),
    {
      name: "pg-builds",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ builds: state.builds, order: state.order }),
    }
  )
);
