import { POST as createProjectPost } from "@/app/api/projetos/criar/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = createProjectPost;
