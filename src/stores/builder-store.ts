"use client";

import { create } from "zustand";

import type { Build, CarId, StyleId } from "@/lib/types";

interface BuilderState {
  carId: CarId | null;
  budget: number;
  styleId: StyleId | null;
  build: Build | null;
  setCarId: (carId: CarId) => void;
  setBudget: (budget: number) => void;
  setStyleId: (styleId: StyleId) => void;
  setBuild: (build: Build) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set) => ({
  carId: null,
  budget: 0,
  styleId: null,
  build: null,
  setCarId: (carId) => set({ carId, build: null }),
  setBudget: (budget) => set({ budget, build: null }),
  setStyleId: (styleId) => set({ styleId, build: null }),
  setBuild: (build) => set({ build }),
  reset: () => set({ carId: null, budget: 0, styleId: null, build: null }),
}));

