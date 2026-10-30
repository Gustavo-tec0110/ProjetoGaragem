import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { hasTrustedMutationOrigin } from "@/lib/security/request-origin";
import { readBoundedBody } from "@/lib/security/bounded-body";
import { TERMS_VERSION, PRIVACY_VERSION } from "@/lib/auth/legal";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const respond = (message: string, status: number) => NextResponse.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
  if (!hasTrustedMutationOrigin(request)) return respond("Origem inválida.", 403);
  const supabase = await getSupabaseServerClient();
  if (!supabase) return respond("Aceite temporariamente indisponível.", 503);
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return respond("Sua sessão expirou. Entre novamente para continuar.", 401);
  let body;
  try { body = await (await readBoundedBody(request, 2048)).json(); }
  catch { return respond("Solicitação inválida.", 400); }
  if (!body || body.accepted !== true || body.termsVersion !== TERMS_VERSION || body.privacyVersion !== PRIVACY_VERSION ||
    Object.keys(body).some((key) => !["accepted", "termsVersion", "privacyVersion"].includes(key))) {
    return respond("Aceite os documentos atuais para continuar.", 400);
  }
  // The authenticated RPC binds auth.uid(), server time and approved versions.
  // No service-role client, metadata proof, client identity or client timestamp.
  const { error } = await supabase.rpc("accept_current_terms", {
    p_terms_version: TERMS_VERSION, p_privacy_version: PRIVACY_VERSION,
  });
  if (error) return respond("Não foi possível registrar o aceite. Os documentos podem estar aguardando aprovação. Tente novamente mais tarde.", 503);
  return respond("Aceite registrado.", 200);
}
