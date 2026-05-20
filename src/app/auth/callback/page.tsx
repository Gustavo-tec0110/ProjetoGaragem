import { OAuthCallback } from "@/components/auth/oauth-callback";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";

export const metadata = {
  title: "Auth Callback",
};

export default async function AuthCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] | undefined }>;
}) {
  const { code } = await searchParams;
  const codeValue = typeof code === "string" ? code : null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-md pt-24 pb-12">
          <OAuthCallback code={codeValue} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

