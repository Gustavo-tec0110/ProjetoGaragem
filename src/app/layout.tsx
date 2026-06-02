import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/montserrat/500.css";
import "@fontsource/montserrat/600.css";
import "@fontsource/montserrat/700.css";
import "@fontsource/poppins/700.css";
import "@fontsource/poppins/800.css";

import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Projeto Garagem",
    template: "%s | Projeto Garagem",
  },
  description:
    "Crie a ficha publica do seu carro e descubra projetos automotivos reais da comunidade.",
};

export const viewport: Viewport = {
  themeColor: "#0B0B0D",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-0">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
