import { listProjectSummaries } from "@/lib/data/repository";
import { HomePageClient } from "@/components/workspace/home-page-client";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const [projects, params] = await Promise.all([
    listProjectSummaries(),
    searchParams,
  ]);

  return (
    <HomePageClient
      initialCreateOpen={params.create === "1"}
      projects={projects}
    />
  );
}
