import type { DraftAsset, EditorBlock, NewsDraft } from "./types";

export function createBlock(
  type: EditorBlock["type"],
  overrides: Partial<EditorBlock> = {},
): EditorBlock {
  return {
    id: crypto.randomUUID(),
    type,
    content: "",
    assetId: undefined,
    ...overrides,
  };
}

export function serializeDraft(draft: NewsDraft) {
  return JSON.stringify(
    {
      ...draft,
      generatedAt: new Date().toISOString(),
      version: 1,
    },
    null,
    2,
  );
}

export function downloadDraft(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[\\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function generatePreviewMdx(
  blocks: EditorBlock[],
  assets: DraftAsset[],
) {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  return blocks
    .map((block) => {
      const content = block.content.trim();
      switch (block.type) {
        case "heading2":
          return content ? `## ${content}` : "";
        case "heading3":
          return content ? `### ${content}` : "";
        case "image": {
          if (!block.assetId) {
            return "";
          }
          const asset = assetMap.get(block.assetId);
          if (!asset) {
            return "";
          }
          const alt =
            (asset.alt ?? content ?? "Изображение").trim() || "Изображение";
          const caption = content ? `\n\n*${content}*` : "";
          return `![${alt}](${asset.dataUrl})${caption}`;
        }
        default:
          return content;
      }
    })
    .filter(Boolean)
    .join("\n\n");
}
