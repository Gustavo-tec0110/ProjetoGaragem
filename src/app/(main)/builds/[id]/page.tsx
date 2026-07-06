import { redirect } from "next/navigation";

export default async function BuildRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projeto/${id}`);
}
