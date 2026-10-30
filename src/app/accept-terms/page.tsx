import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getPostTermsPath } from "@/lib/auth/redirect";
import { hasCurrentTerms } from "@/lib/auth/terms-server";
import { AcceptTermsForm } from "./terms-form";

export const metadata = { title: "Aceite dos Termos", robots: { index: false, follow: false } };
export default async function AcceptTermsPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = getPostTermsPath((await searchParams).next);
  const supabase = await getSupabaseServerClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/accept-terms?next=${encodeURIComponent(next)}`)}`);
  if (supabase && await hasCurrentTerms(supabase)) redirect(next);
  return <AuthShell eyebrow="Antes de continuar" title="Termos de Uso" description="Leia os documentos e confirme o aceite para usar os recursos da sua conta.">
    <AcceptTermsForm next={next} />
  </AuthShell>;
}
