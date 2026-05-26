type EditorAsset = {
  id: string;
};

export function orderEditorAssets<T extends EditorAsset>(assets: T[], focusedAssetId?: string | null) {
  if (!focusedAssetId) {
    return [...assets];
  }

  return [...assets].sort((left, right) => {
    if (left.id === focusedAssetId) return -1;
    if (right.id === focusedAssetId) return 1;
    return 0;
  });
}
