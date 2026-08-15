import type { ReactNode } from "react";

export default function RouteTemplate({ children }: { children: ReactNode }) {
  return <div className="pg-route-enter min-h-0 flex-1">{children}</div>;
}
