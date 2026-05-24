import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import { parseBuildPartIds } from "@/lib/supabase/queries";

export const contentType = "image/png";

type BuildRow = {
  slug: string;
  title: string;
  user_id: string;
  car_id: string;
  style: string;
  compatibility_score: number;
  parts: unknown;
  car_photo_url: string | null;
  is_public: boolean;
};

function carFallbackImage(carSlug: string) {
  const key = carSlug.toLowerCase();
  if (key.includes("golf") || key.includes("wrx")) return "/ref/car-white.jpg";
  if (key.includes("gol") || key.includes("onix")) return "/ref/car-black.jpg";
  return "/ref/hero-car.jpg";
}

function formatBRLCompact(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value < 1000) return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
  const raw = value / 1000;
  const fixed = raw >= 10 ? raw.toFixed(0) : raw.toFixed(1);
  return `R$ ${fixed.replace(".", ",")}k`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isSupabaseConfigured) {
    return new Response("Supabase não configurado.", { status: 500 });
  }

  const { slug } = await params;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: build, error: buildError } = await supabase
    .from("builds")
    .select("slug, title, user_id, car_id, style, compatibility_score, parts, car_photo_url, is_public")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (buildError || !build) {
    return new Response("Not found", { status: 404 });
  }

  const typedBuild = build as BuildRow;
  const usernameRes = await supabase
    .from("profiles")
    .select("username")
    .eq("id", typedBuild.user_id)
    .maybeSingle();

  const carRes = await supabase
    .from("cars")
    .select("name, slug")
    .eq("id", typedBuild.car_id)
    .maybeSingle();

  const partIds = parseBuildPartIds(typedBuild.parts);
  const partsRes = partIds.length
    ? await supabase
        .from("parts")
        .select("id, name, brand, price_min, price_max")
        .in("id", partIds)
    : { data: [] as Array<{ id: string; name: string; brand: string | null; price_min: number | null; price_max: number | null }> };

  const topParts = (partsRes.data ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, 3);

  const total = (partsRes.data ?? []).reduce(
    (acc, p) => ({
      min: acc.min + (p.price_min ?? 0),
      max: acc.max + (p.price_max ?? p.price_min ?? 0),
    }),
    { min: 0, max: 0 }
  );
  const totalMid = Math.round((total.min + total.max) / 2);

  const carName = carRes.data?.name ?? "Carro";
  const carSlug = carRes.data?.slug ?? "";
  const author = usernameRes.data?.username ? `@${usernameRes.data.username}` : "@membro";

  const heroSrc = typedBuild.car_photo_url
    ? typedBuild.car_photo_url
    : new URL(carFallbackImage(carSlug), request.url).toString();

  const accent = "#FF7A00";
  const bg = "#0B0B0D";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "row",
          backgroundColor: bg,
          color: "white",
          padding: 56,
          gap: 44,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 520,
            height: "100%",
            gap: 18,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 360,
              overflow: "hidden",
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,0.12)",
              backgroundColor: "#111114",
            }}
          >
            <img
              src={heroSrc}
              alt=""
              width={520}
              height={360}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.88,
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.78) 100%)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                opacity: 0.9,
                fontSize: 22,
              }}
            >
              <span style={{ color: accent, fontWeight: 800 }}>ProjetoGaragem</span>
              <span style={{ opacity: 0.8 }}>•</span>
              <span style={{ opacity: 0.9 }}>{author}</span>
            </div>

            <div style={{ fontSize: 42, fontWeight: 800, lineHeight: 1.08 }}>
              {typedBuild.title}
            </div>

            <div style={{ fontSize: 20, opacity: 0.85 }}>
              {carName} • {typedBuild.style}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              gap: 16,
              alignItems: "center",
              justifyContent: "space-between",
              padding: 24,
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 18, opacity: 0.78 }}>Compatibilidade</div>
              <div style={{ fontSize: 44, fontWeight: 900, color: accent }}>
                {typedBuild.compatibility_score}%
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              <div style={{ fontSize: 18, opacity: 0.78 }}>Orçamento (peças)</div>
              <div style={{ fontSize: 34, fontWeight: 900 }}>{formatBRLCompact(totalMid)}</div>
              <div style={{ fontSize: 16, opacity: 0.72 }}>
                {formatBRLCompact(Math.round(total.min))}–{formatBRLCompact(Math.round(total.max))}
              </div>
            </div>
          </div>

          <div style={{ height: 26 }} />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              padding: 28,
              borderRadius: 32,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.03)",
              flex: 1,
            }}
          >
            <div style={{ fontSize: 20, opacity: 0.78 }}>Top 3 peças</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {topParts.length ? (
                topParts.map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "14px 16px",
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.25)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: 20, fontWeight: 800 }}>
                        {p.brand ? `${p.brand} ` : ""}
                        {p.name}
                      </div>
                      <div style={{ fontSize: 16, opacity: 0.72 }}>
                        {p.price_min == null && p.price_max == null
                          ? "Preço a definir"
                          : `${formatBRLCompact(p.price_min ?? p.price_max ?? 0)}–${formatBRLCompact(p.price_max ?? p.price_min ?? 0)}`}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 900,
                        padding: "8px 12px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {typedBuild.compatibility_score >= 85 ? "OK" : typedBuild.compatibility_score >= 60 ? "CHECK" : "RISK"}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: 18,
                    borderRadius: 22,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(0,0,0,0.25)",
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 800 }}>Sem peças</div>
                  <div style={{ fontSize: 16, opacity: 0.72 }}>
                    Monte no planejador para preencher.
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,122,0,0.12)",
                  color: accent,
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {typedBuild.slug}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 16,
                  fontWeight: 800,
                }}
              >
                ProjetoGaragem
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
