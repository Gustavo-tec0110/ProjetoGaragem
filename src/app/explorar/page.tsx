import { ExploreBrowser } from "@/components/explore/explore-browser";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { communityBuilds, communityCreators } from "@/lib/data/community";

export const metadata = {
  title: "Explorar",
};

export default function ExplorarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-24 pb-12">
          <h1 className="font-title text-3xl md:text-4xl tracking-tight">
            Explorar Builds
          </h1>
          <p className="mt-2 text-muted max-w-2xl">
            Builds prontas, kits compatíveis e inspiração visual — do JDM ao
            Luxo, com cara de app premium.
          </p>

          <div className="mt-8">
            <ExploreBrowser builds={communityBuilds} creators={communityCreators} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
