import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/types/supabase";

export const contentType = "image/png";

function fallbackImage() {
  return "/ref/hero-car.jpg";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!isSupabaseConfigured) {
    return new Response("Supabase nao configurado.", { status: 500 });
  }

  const { slug } = await params;
  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { data: car } = await supabase
    .from("cars")
    .select("*")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (!car) return new Response("Not found", { status: 404 });

  const [{ data: owner }, { data: parts }] = await Promise.all([
    supabase.from("public_profiles").select("username, display_name").eq("id", car.owner_id).maybeSingle(),
    supabase.from("car_parts").select("name, category, status").eq("car_id", car.id).limit(4),
  ]);

  const heroSrc = car.main_photo_url ?? new URL(fallbackImage(), request.url).toString();
  const accent = "#FF2A2A";

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          background: "#0B0B0D",
          color: "white",
          padding: 56,
          gap: 42,
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 520,
            height: "100%",
            borderRadius: 34,
            overflow: "hidden",
            position: "relative",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <img src={heroSrc} alt="" width={520} height={520} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent, rgba(0,0,0,.72))" }} />
        </div>

        <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", gap: 12, fontSize: 24, alignItems: "center" }}>
              <span style={{ color: accent, fontWeight: 900 }}>Projeto Garagem</span>
              <span style={{ opacity: 0.7 }}>@{owner?.username ?? "garagem"}</span>
            </div>
            <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1.02 }}>{car.name}</div>
            <div style={{ fontSize: 28, opacity: 0.86 }}>
              {car.brand} {car.model} {car.year} - {car.category}
            </div>
            <div style={{ fontSize: 22, opacity: 0.75 }}>
              {owner?.display_name ?? "Membro"} compartilhou uma ficha publica com fotos, pecas e especificacoes.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", gap: 14 }}>
              <Metric label="Curtidas" value={car.likes_count} />
              <Metric label="Salvos" value={car.saves_count} />
              <Metric label="Comentarios" value={car.comments_count} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {parts?.length ? (
                parts.map((part) => (
                  <div
                    key={`${part.name}-${part.category}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      border: "1px solid rgba(255,255,255,.14)",
                      borderRadius: 20,
                      padding: "12px 16px",
                      background: "rgba(255,255,255,.05)",
                      fontSize: 18,
                    }}
                  >
                    <span>{part.name}</span>
                    <span style={{ opacity: 0.72 }}>{part.status === "installed" ? "Instalada" : "Planejada"}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 20, opacity: 0.72 }}>Ficha pronta para receber pecas e planos futuros.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        flexDirection: "column",
        gap: 4,
        border: "1px solid rgba(255,255,255,.14)",
        borderRadius: 24,
        padding: "18px 20px",
        background: "rgba(255,255,255,.05)",
      }}
    >
      <span style={{ fontSize: 16, opacity: 0.7 }}>{label}</span>
      <span style={{ fontSize: 30, fontWeight: 900 }}>{value.toLocaleString("pt-BR")}</span>
    </div>
  );
}
