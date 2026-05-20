import { MeProfile } from "@/components/profile/me-profile";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export const metadata = {
  title: "Perfil",
};

export default function PerfilMePage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
          <MeProfile />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

