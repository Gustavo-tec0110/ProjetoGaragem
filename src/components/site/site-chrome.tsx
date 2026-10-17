"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { AuthProvider } from "@/components/AuthProvider";
import { CookieConsent } from "@/components/privacy/cookie-consent";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // This invitation has its own presentation and uses no auth or consent storage.
  if (pathname === "/parcerias/criadores") return children;

  return (
    <AuthProvider>
      <SiteNavbar />
      {children}
      <SiteFooter />
      <CookieConsent />
    </AuthProvider>
  );
}
