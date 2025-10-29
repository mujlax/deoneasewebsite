export type EditorBlockType = "paragraph" | "heading2" | "heading3" | "image";

export type EditorBlock = {
  id: string;
  type: EditorBlockType;
  content: string;
  assetId?: string;
};

export type NewsDraftMeta = {
  title: string;
  description: string;
  date: string;
  tags: string;
  coverAlt: string;
};

export type DraftAssetKind = "cover" | "inline";

export type DraftAsset = {
  id: string;
  filename: string;
  dataUrl: string;
  kind: DraftAssetKind;
  alt?: string;
};

export type NewsDraft = {
  meta: NewsDraftMeta;
  blocks: EditorBlock[];
  assets: DraftAsset[];
};
