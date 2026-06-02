import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Bookmark, Heart, MapPin, MessageCircle, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumCard } from "@/components/ui/premium-card";
import type { CarCard as CarCardData } from "@/lib/supabase/queries";

function compact(value: number) {
  return value.toLocaleString("pt-BR");
}

export function CarCard({ car }: { car: CarCardData }) {
  const image = car.main_photo_url || "/ref/hero-car.jpg";
  const location = [car.city, car.state].filter(Boolean).join(", ");

  return (
    <PremiumCard className="group overflow-hidden">
      <Link href={`/carros/${car.slug}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface">
          <Image
            src={image}
            alt={`Foto do projeto ${car.name}`}
            fill
            unoptimized
            className="object-cover opacity-90 transition duration-300 group-hover:scale-105"
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 90vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
          <div className="absolute left-4 top-4">
            <Badge variant="secondary">{car.category}</Badge>
          </div>
          <div className="absolute bottom-4 left-4 right-4">
            <h3 className="font-title text-xl tracking-tight">{car.name}</h3>
            <p className="mt-1 text-sm text-muted">
              {car.brand} {car.model} {car.year}
            </p>
          </div>
        </div>
      </Link>

      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href={`/perfil/${car.owner?.username ?? ""}`} className="text-sm font-semibold hover:text-accent">
              {car.owner?.display_name ?? "Membro"}
            </Link>
            {location ? (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                <MapPin className="size-3" />
                {location}
              </p>
            ) : null}
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href={`/carros/${car.slug}`}>Abrir</Link>
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-muted">
          <div className="rounded-3xl border border-border/70 bg-background/25 px-2 py-2">
            <Heart className="mx-auto mb-1 size-4 text-accent" />
            {compact(car.likes_count)}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-2 py-2">
            <Bookmark className="mx-auto mb-1 size-4 text-accent" />
            {compact(car.saves_count)}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-2 py-2">
            <MessageCircle className="mx-auto mb-1 size-4 text-accent" />
            {compact(car.comments_count)}
          </div>
          <div className="rounded-3xl border border-border/70 bg-background/25 px-2 py-2">
            <Wrench className="mx-auto mb-1 size-4 text-accent" />
            {car.installed_parts_count}/{car.planned_parts_count}
          </div>
        </div>
      </div>
    </PremiumCard>
  );
}

export function CarGrid({
  cars,
  emptyTitle = "Nenhum carro encontrado.",
  emptyAction,
}: {
  cars: CarCardData[];
  emptyTitle?: string;
  emptyAction?: ReactNode;
}) {
  if (!cars.length) {
    return (
      <div className="rounded-4xl border border-border/70 bg-background/25 p-6 text-center">
        <h3 className="font-title text-xl tracking-tight">{emptyTitle}</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Quando houver projetos cadastrados, eles aparecem aqui com foto, ficha e interacoes.
        </p>
        {emptyAction ? <div className="mt-5">{emptyAction}</div> : null}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cars.map((car) => (
        <CarCard key={car.id} car={car} />
      ))}
    </div>
  );
}
