"use client";

import { useCallback } from "react";

// React preserves dirty text controls when hydrating, but does not replay earlier
// input events into state. Adopt the live value when attaching a controlled input,
// before a later render can restore its stale initial state. The setter must be stable.
export function useHydrationInput(setValue: (value: string) => void) {
  return useCallback((input: HTMLInputElement | null) => {
    // Leave intentional empty/sentinel UI state alone when the control was not edited.
    if (input && input.value !== input.defaultValue) setValue(input.value);
  }, [setValue]);
}
