import { readBoundedBody } from "@/lib/security/bounded-body";
import { hasTrustedMutationOrigin } from "@/lib/security/request-origin";
import { NextResponse } from "next/server";

import {
  createCarProject,
  revalidateProjectCreationPaths,
} from "@/lib/garage/create-car-project";
import { performanceTimer } from "@/lib/performance";
import { PROJECT_REQUEST_MAX_BYTES } from "@/lib/security/limits";
import { allowRequest } from "@/lib/security/request-rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!hasTrustedMutationOrigin(request)) return NextResponse.json({ message: "Origem inválida." }, { status: 403 });
  const timer = performanceTimer("request", "project.create");
  const rate = allowRequest(request.headers, "project-create", 12, 60_000);
  if (!rate.ok) {
    return NextResponse.json({ status: "error", message: "Muitas tentativas. Aguarde e tente novamente." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > PROJECT_REQUEST_MAX_BYTES) {
    return NextResponse.json({ status: "error", message: "O formulário excede o tamanho permitido." }, { status: 413 });
  }
  let formData: FormData;

  try {
    const parseStartedAt = performance.now();
    formData = await (await readBoundedBody(request, PROJECT_REQUEST_MAX_BYTES)).formData();
    timer.lap("formData", parseStartedAt);
  } catch (error) {
    if (error instanceof Error && error.message === "body_too_large") return NextResponse.json({ message: "Solicitação muito grande." }, { status: 413 });
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
