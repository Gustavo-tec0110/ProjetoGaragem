import Stepper from '@/components/build/Stepper';
import { SiteFooter } from '@/components/site/site-footer';
import { SiteNavbar } from '@/components/site/site-navbar';

export const metadata = {
  title: 'Planejador de Build',
};

export default function MontarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl pt-20 md:pt-24 pb-12">
          <Stepper />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

