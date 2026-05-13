"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type SocialComment = {
  id: string;
  authorName: string;
  authorHandle: string;
  message: string;
  createdAt: string;
};

type SocialState = {
  liked: Record<string, boolean>;
  saved: Record<string, boolean>;
  comments: Record<string, SocialComment[]>;
  toggleLike: (postId: string) => void;
  toggleSave: (postId: string) => void;
  addComment: (
    postId: string,
    comment: Pick<SocialComment, "authorName" | "authorHandle" | "message">
  ) => void;
};

function safeId() {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `pg_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export const useSocialStore = create<SocialState>()(
  persist(
    (set) => ({
      liked: {},
      saved: {},
      comments: {},
      toggleLike: (postId) =>
        set((state) => ({
          liked: { ...state.liked, [postId]: !state.liked[postId] },
        })),
      toggleSave: (postId) =>
        set((state) => ({
          saved: { ...state.saved, [postId]: !state.saved[postId] },
        })),
      addComment: (postId, comment) =>
        set((state) => {
          const next = [
            ...(state.comments[postId] ?? []),
            { ...comment, id: safeId(), createdAt: "agora" },
          ];
          return { comments: { ...state.comments, [postId]: next } };
        }),
    }),
    {
      name: "pg-social",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        liked: state.liked,
        saved: state.saved,
        comments: state.comments,
      }),
    }
  )
);

