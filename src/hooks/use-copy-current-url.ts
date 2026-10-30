"use client";

import * as React from "react";

export function useCopyCurrentUrl(feedbackDuration = 1600) {
  const [copied, setCopied] = React.useState(false);
  const [manualUrl, setManualUrl] = React.useState("");
  const timeoutRef = React.useRef<number | null>(null);

  React.useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    []
  );

  const copyCurrentUrl = React.useCallback(async () => {
    setCopied(false);
    setManualUrl("");
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard-unavailable");
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      setManualUrl(window.location.href);
      return;
    }

    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, feedbackDuration);
  }, [feedbackDuration]);

  return { copied, copyCurrentUrl, manualUrl };
}
