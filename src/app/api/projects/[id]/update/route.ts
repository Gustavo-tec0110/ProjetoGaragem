import { NextResponse } from "next/server";

import {
  revalidateProjectUpdatePaths,
  updateCarProject,
} from "@/lib/garage/create-car-project";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Formulario invalido." },
      { status: 400 }
    );
  }

  const { id } = await params;
  const previousSlug = typeof formData.get("current_slug") === "string"
    ? String(formData.get("current_slug"))
    : "";
  const result = await updateCarProject(id, formData);

  if (!result.ok) {
    return NextResponse.json(
      { status: "error", message: result.message },
      { status: result.status }
    );
  }

  revalidateProjectUpdatePaths(previousSlug || result.slug, result.slug);

  return NextResponse.json(
    { status: "success", slug: result.slug, redirectTo: result.redirectTo },
    { status: 200 }
  );
}
