import { redirect } from "next/navigation";

export default async function ProfileRedirectPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  redirect(`/perfil/${username}`);
}
