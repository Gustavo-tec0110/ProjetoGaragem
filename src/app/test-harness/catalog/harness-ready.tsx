"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

// Test-only DOM marker: do not interact with server-rendered controls before hydration.
export function CatalogHarnessReady() {
  const ready = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  return <span hidden data-catalog-ready={String(ready)} />;
}
