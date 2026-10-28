"use client";

import { useEffect, useRef } from "react";

// Test-only DOM marker: do not interact with server-rendered controls before hydration.
export function CatalogHarnessReady() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => { ref.current?.setAttribute("data-catalog-ready", "true"); }, []);
  return <span ref={ref} hidden data-catalog-ready="false" />;
}
