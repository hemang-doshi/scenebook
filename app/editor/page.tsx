import { listProjectSummaries } from "@/lib/data/repository";
import { EditorHomePageClient } from "@/components/editor/EditorHomePageClient";

export default async function EditorHomePage() {
  const projects = await listProjectSummaries();
  return <EditorHomePageClient projects={projects} />;
}
