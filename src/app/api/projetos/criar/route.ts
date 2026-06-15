import { NextResponse } from "next/server";

import {
  createCarProject,
  revalidateProjectCreationPaths,
} from "@/lib/garage/create-car-project";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { status: "error", message: "Formulario invalido." },
      { status: 400 }
    );
  }

  const result = await createCarProject(formData);

  if (!result.ok) {
    return NextResponse.json(
      { status: "error", message: result.message },
      { status: result.status }
    );
  }

  revalidateProjectCreationPaths(result.slug);

  return NextResponse.json(
    { status: "success", slug: result.slug, redirectTo: result.redirectTo },
    { status: 201 }
  );
}
