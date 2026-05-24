import { OnboardingForm } from "@/components/auth/onboarding-form";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export const metadata = {
  title: "Onboarding",
};

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-2xl pt-20 md:pt-24 pb-12">
          <OnboardingForm />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

