import { getCardDetail } from "@/lib/data/repository";
import { EditorPageClient } from "@/components/editor/EditorPageClient";

export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ cardId: string }>;
  searchParams: Promise<{ asset?: string }>;
}) {
  const [{ cardId }, { asset }] = await Promise.all([params, searchParams]);
  const project = cardId === "new" ? null : await getCardDetail(cardId);

  return (
    <EditorPageClient
      cardId={cardId}
      focusedAssetId={asset ?? null}
      initialProject={project}
    />
  );
}
