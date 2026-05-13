import { CommunityRanking } from "@/components/home/community-ranking";
import { FeaturedBuilds } from "@/components/home/featured-builds";
import { Hero } from "@/components/home/hero";
import { PopularCars } from "@/components/home/popular-cars";
import { StylesGrid } from "@/components/home/styles-grid";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">
        <Hero />
        <StylesGrid />
        <FeaturedBuilds />
        <CommunityRanking />
        <PopularCars />
      </main>
      <SiteFooter />
    </div>
  );
}
