import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar,
  Gauge,
  MapPin,
  Settings,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { CarSocialActions } from "@/components/garage/car-social-actions";
import { CommentForm, CommentsList } from "@/components/garage/comments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavbar } from "@/components/site/site-navbar";
import { qCarBySlug } from "@/lib/supabase/queries";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { CarPartRow } from "@/lib/types";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function valueOrDash(value: string | number | null | undefined) {
  return value == null || value === "" ? "Nao informado" : String(value);
}

function Spec({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="rounded-3xl border border-border/70 bg-background/25 p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-ui text-sm font-semibold">{valueOrDash(value)}</p>
    </div>
  );
}

function PartsSection({ title, parts }: { title: string; parts: CarPartRow[] }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-muted">Pecas</p>
          <h2 className="mt-1 font-title text-2xl tracking-tight">{title}</h2>
        </div>
        <Badge>{parts.length} itens</Badge>
      </div>

      <div className="mt-4 grid gap-3">
        {parts.length ? (
          parts.map((part) => (
            <Card key={part.id} className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <Badge variant={part.status === "installed" ? "success" : "warning"}>
                    {part.status === "installed" ? "Instalada" : "Planejada"}
                  </Badge>
                  <h3 className="mt-3 font-title text-lg tracking-tight">
                    {part.brand ? `${part.brand} ` : ""}
                    {part.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{part.category}</p>
                  {part.description ? <p className="mt-3 text-sm text-foreground/85">{part.description}</p> : null}
                </div>
                <div className="min-w-44 text-left sm:text-right">
                  <p className="text-xs text-muted">Preco estimado</p>
                  <p className="mt-1 font-ui text-sm font-semibold">
                    {part.price_estimate ? `R$ ${part.price_estimate.toLocaleString("pt-BR")}` : "Nao informado"}
                  </p>
                  {part.external_url || part.affiliate_url ? (
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <a href={part.affiliate_url ?? part.external_url ?? "#"} target="_blank" rel="noreferrer">
                        Ver peca
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="mt-3" disabled>
                      Buscar peca
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
            Nenhuma peca cadastrada nesta secao.
          </div>
        )}
      </div>
    </section>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await qCarBySlug(slug);
  if (!result.data) return { title: "Carro nao encontrado" };

  const car = result.data;
  return {
    title: `${car.name} | Projeto Garagem`,
    description: `Veja fotos, especificacoes, pecas instaladas e planos futuros do ${car.brand} ${car.model}.`,
    openGraph: {
      title: `${car.name} | Projeto Garagem`,
      description: `Ficha publica do projeto ${car.brand} ${car.model} ${car.year}.`,
      images: car.main_photo_url ? [{ url: car.main_photo_url }] : undefined,
    },
  };
}

export default async function CarPage({ params }: PageProps) {
  const { slug } = await params;
  const result = await qCarBySlug(slug);
  if (!result.data) notFound();

  const car = result.data;
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };

  const installed = car.parts.filter((part) => part.status === "installed");
  const planned = car.parts.filter((part) => part.status === "planned");
  const photos = [
    car.main_photo_url,
    ...car.photos.map((photo) => photo.url),
    ...car.photo_urls,
  ].filter((url, index, array): url is string => Boolean(url) && array.indexOf(url) === index);
  const hero = photos[0] ?? "/ref/hero-car.jpg";
  const location = [car.city, car.state].filter(Boolean).join(", ");
  const isOwner = user?.id === car.owner_id;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SiteNavbar />
      <main className="flex-1">
        <section className="relative min-h-[76vh] px-4 sm:px-6">
          <div className="absolute inset-0">
            <Image src={hero} alt={`Foto do projeto ${car.name}`} fill priority unoptimized className="object-cover opacity-70" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/70 to-transparent" />
          </div>

          <div className="relative mx-auto flex min-h-[76vh] w-full max-w-6xl flex-col justify-end pb-10 pt-28">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{car.category}</Badge>
                {location ? <Badge>{location}</Badge> : null}
                {car.is_public ? <Badge variant="success">Publico</Badge> : <Badge variant="warning">Privado</Badge>}
              </div>

              <h1 className="mt-5 font-title text-4xl tracking-tight md:text-6xl">{car.name}</h1>
              <p className="mt-3 text-lg text-muted md:text-xl">
                {car.brand} {car.model} {car.year}
                {car.version ? ` - ${car.version}` : ""}
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted">
                <Link href={`/perfil/${car.owner?.username ?? ""}`} className="font-semibold text-foreground hover:text-accent">
                  {car.owner?.display_name ?? "Membro"}
                </Link>
                {location ? (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" />
                    {location}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-4" />
                  {new Date(car.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {car.description ? <p className="mt-5 max-w-2xl text-foreground/90">{car.description}</p> : null}

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <CarSocialActions
                  carId={car.id}
                  liked={car.viewer_has_liked}
                  saved={car.viewer_has_saved}
                  likesCount={car.likes_count}
                  savesCount={car.saves_count}
                  viewerLoggedIn={Boolean(user)}
                />
                {isOwner ? (
                  <Button asChild variant="outline">
                    <Link href={`/carros/${car.slug}/editar`}>Editar ficha</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <div className="px-4 sm:px-6">
          <div className="mx-auto w-full max-w-6xl space-y-12 pb-14">
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="p-5">
                <Gauge className="size-5 text-accent" />
                <p className="mt-3 text-xs text-muted">Potencia</p>
                <p className="mt-1 font-title text-2xl">{car.power_cv ? `${car.power_cv} cv` : "N/I"}</p>
              </Card>
              <Card className="p-5">
                <Wrench className="size-5 text-accent" />
                <p className="mt-3 text-xs text-muted">Pecas</p>
                <p className="mt-1 font-title text-2xl">{installed.length} instaladas</p>
              </Card>
              <Card className="p-5">
                <Settings className="size-5 text-accent" />
                <p className="mt-3 text-xs text-muted">Planos</p>
                <p className="mt-1 font-title text-2xl">{planned.length} planejadas</p>
              </Card>
              <Card className="p-5">
                <ShieldCheck className="size-5 text-accent" />
                <p className="mt-3 text-xs text-muted">Salvos</p>
                <p className="mt-1 font-title text-2xl">{car.saves_count.toLocaleString("pt-BR")}</p>
              </Card>
            </section>

            <section>
              <p className="text-xs text-muted">Ficha tecnica</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">Especificacoes</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Spec label="Marca" value={car.brand} />
                <Spec label="Modelo" value={car.model} />
                <Spec label="Ano" value={car.year} />
                <Spec label="Motor" value={car.engine} />
                <Spec label="Combustivel" value={car.fuel_type} />
                <Spec label="Cambio" value={car.transmission} />
                <Spec label="Tracao" value={car.drivetrain} />
                <Spec label="Suspensao" value={car.suspension} />
                <Spec label="Rodas" value={car.wheels} />
                <Spec label="Pneus" value={car.tires} />
                <Spec label="Freios" value={car.brakes} />
                <Spec label="Categoria" value={car.category} />
              </div>
            </section>

            <PartsSection title="Pecas instaladas" parts={installed} />

            {installed.some((part) => part.category.toLowerCase().includes("turbo")) ? (
              <div className="rounded-4xl border border-warning/30 bg-warning/10 p-5">
                <p className="font-ui text-sm font-semibold">Recomendacao de compatibilidade</p>
                <p className="mt-2 text-sm text-muted">
                  Projeto turbo geralmente pede intercooler, alimentacao, acerto, embreagem reforcada e wideband.
                </p>
              </div>
            ) : null}

            <PartsSection title="Pecas planejadas" parts={planned} />

            <section>
              <p className="text-xs text-muted">Galeria</p>
              <h2 className="mt-1 font-title text-2xl tracking-tight">Fotos</h2>
              {photos.length ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {photos.map((photo, index) => (
                    <div key={photo} className="relative aspect-[4/3] overflow-hidden rounded-4xl border border-border/70 bg-surface">
                      <Image src={photo} alt={`Foto ${index + 1} do projeto ${car.name}`} fill unoptimized className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-4xl border border-border/70 bg-background/25 p-5 text-sm text-muted">
                  Este projeto ainda nao tem fotos.
                </div>
              )}
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
              <Card className="p-5 md:p-6">
                <h2 className="font-title text-2xl tracking-tight">Comentar</h2>
                <div className="mt-4">
                  <CommentForm carId={car.id} slug={car.slug} viewerLoggedIn={Boolean(user)} />
                </div>
              </Card>
              <div>
                <h2 className="font-title text-2xl tracking-tight">Comentarios</h2>
                <div className="mt-4">
                  <CommentsList comments={car.comments} viewerId={user?.id ?? null} ownerId={car.owner_id} carSlug={car.slug} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
