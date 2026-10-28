import { localOffersEnabled, localCatalogOffers } from "@/lib/modifications/local-offers";
import { getSupabasePublicClient } from "@/lib/supabase/server";
import { catalogOfferDemoEnabled, demoCatalogOffers } from "@/lib/modifications/demo-offers";
import { publicOffer } from "@/lib/modifications/offers";
import { allowRequest } from "@/lib/security/request-rate-limit";
import { serverLog } from "@/lib/server-log";

const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const local = localOffersEnabled();
  const demo = catalogOfferDemoEnabled() && new URL(request.url).searchParams.get("demonstration") === "1";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    && !((demo || local) && /^local-[a-z0-9-]{1,100}$/.test(id))) {
    return Response.json({ error: "Componente inválido." }, { status: 400, headers });
  }
  const rate = allowRequest(request.headers, "catalog-offers", 120, 60_000);
  if (!rate.ok) return Response.json({ error: "Tente novamente em instantes." }, { status: 429, headers: { ...headers, "Retry-After": String(rate.retryAfter) } });
  if (local) {
    const slug = new URL(request.url).searchParams.get("slug") ?? "";
    if (!/^[a-z0-9-]{1,100}$/.test(slug)) return Response.json({ error: "Componente inválido." }, { status: 400, headers });
    try { return Response.json(await localCatalogOffers(slug), { headers }); }
    catch {
      serverLog.warn("catalog-offers", { action: "local.read.failed" });
      return Response.json({ offers: [], demonstration: false, unavailable: true }, { headers });
    }
  }
  if (demo) return Response.json(demoCatalogOffers(id), { headers });
  const supabase = getSupabasePublicClient();
  if (!supabase) return Response.json({ offers: [], demonstration: false, unavailable: true }, { headers });
  const { data, error } = await supabase.from("modification_offers")
    .select("id,catalog_id,store,destination_url,is_active,is_affiliate,price,price_checked_at,created_at,updated_at,product_name,product_url,compatibility_notes,verified_at,source,source_product_id")
    .eq("catalog_id", id).eq("is_active", true).not("verified_at", "is", null).order("created_at").limit(20);
  if (error) {
    // Missing migration is an expected state before affiliate activation. The catalog remains usable.
    serverLog.warn("catalog-offers", { action: "read.failed", code: error.code });
    return Response.json({ offers: [], demonstration: false, unavailable: true }, { headers });
  }
  return Response.json({ offers: (data ?? []).flatMap((row) => { const offer = publicOffer(row); return offer ? [offer] : []; }), demonstration: false }, { headers });
}
