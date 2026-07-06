import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CarPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/projeto/${slug}`);
}
