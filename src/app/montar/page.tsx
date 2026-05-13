import { BuilderWizard } from "@/components/builder/builder-wizard";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export const metadata = {
  title: "Montar Projeto",
};

export default function MontarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
          <BuilderWizard />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

