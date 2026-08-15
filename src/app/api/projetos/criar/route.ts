import { NextResponse } from "next/server";

import {
  createCarProject,
  revalidateProjectCreationPaths,
} from "@/lib/garage/create-car-project";
import { performanceTimer } from "@/lib/performance";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const timer = performanceTimer("request", "project.create");
  let formData: FormData;

  try {
    const parseStartedAt = performance.now();
    formData = await request.formData();
    timer.lap("formData", parseStartedAt);
  } catch {
    timer.end({ ok: false, status: 400 });
    return NextResponse.json(
      { status: "error", message: "Formulario invalido." },
      { status: 400 }
    );
  }

  const actionStartedAt = performance.now();
  const result = await createCarProject(formData);
  timer.lap("action", actionStartedAt);

  if (!result.ok) {
    timer.end({ ok: false, status: result.status });
    return NextResponse.json(
      { status: "error", message: result.message },
      { status: result.status }
    );
  }

  const revalidateStartedAt = performance.now();
  revalidateProjectCreationPaths();
  timer.lap("revalidation", revalidateStartedAt);
  timer.end({ ok: true, status: 201 });

  return NextResponse.json(
    { status: "success", slug: result.slug, redirectTo: result.redirectTo },
    { status: 201 }
  );
}
