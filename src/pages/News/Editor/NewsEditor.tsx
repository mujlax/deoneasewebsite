import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/UI/Button";
import styles from "./NewsEditor.module.css";
import newsIndex from "@/content/news/index.json";
import {
  createBlock,
  downloadDraft,
  generatePreviewMdx,
  serializeDraft,
  slugify,
} from "./utils";
import type {
  DraftAsset,
  EditorBlock,
  EditorBlockType,
  NewsDraft,
} from "./types";
import matter from "gray-matter";
import { Buffer } from "buffer";

// Добавляем Buffer в глобальную область для gray-matter
if (typeof window !== "undefined") {
  // @ts-expect-error - Buffer не определен в Window, но нужен для gray-matter
  window.Buffer = window.Buffer || Buffer;
}

const blockOptions: { label: string; type: EditorBlockType }[] = [
  { label: "Параграф", type: "paragraph" },
  { label: "Заголовок H2", type: "heading2" },
  { label: "Заголовок H3", type: "heading3" },
  { label: "Изображение", type: "image" },
];

const defaultDate = new Date().toISOString().slice(0, 10);

const defaultMetaState = {
  title: "",
  description: "",
  date: defaultDate,
  tags: "",
  coverAlt: "",
};

const processedDraftLoaders = import.meta.glob(
  "../../../content/news/drafts/_processed/*.json",
  {
    query: "?raw",
    import: "default",
  },
) as Record<string, () => Promise<string>>;

// Используем правильный относительный путь (2 уровня вверх от Editor/)
// Загружаем MDX файлы как сырой текст через query: '?raw' с import: 'default'
const mdxLoadersRaw = import.meta.glob("../../../content/news/*.mdx", {
  query: "?raw",
  import: "default",
  eager: false,
});

console.log("MDX loaders available paths:", Object.keys(mdxLoadersRaw));

const loaders = mdxLoadersRaw;

const mdxLoaderBySlug = Object.entries(loaders).reduce(
  (acc, [path, loader]) => {
    const fileName = (path.split("?")[0] ?? "").split("/").pop() ?? "";
    const slug = fileName.replace(".mdx", "");
    console.log("Processing MDX path:", path, "-> slug:", slug);
    if (slug) {
      acc[slug] = loader as () => Promise<string>;
    }
    return acc;
  },
  {} as Record<string, () => Promise<string>>,
);

console.log("MDX loaders by slug:", Object.keys(mdxLoaderBySlug));

// Загружаем MDX файлы через glob loader
function normalizeGlobPath(path: string) {
  return path.split("?")[0];
}

async function loadMdxFile(slug: string): Promise<string> {
  console.log("Loading MDX for slug:", slug);
  console.log("Available slugs:", Object.keys(mdxLoaderBySlug));

  const loader = mdxLoaderBySlug[slug];
  if (!loader) {
    console.error("MDX loader not found for slug:", slug);
    throw new Error("mdx-not-found");
  }

  console.log("Found loader, loading...");
  const result = await loader();
  console.log("Loader result type:", typeof result);
  console.log(
    "Loader result:",
    typeof result === "string" ? result.substring(0, 200) : result,
  );

  // query: '?raw' без import: 'default' возвращает объект вида { default: string }
  if (result && typeof result === "object" && "default" in result) {
    const mod = result as { default: unknown };
    console.log("Result has default, type:", typeof mod.default);
    if (typeof mod.default === "string") {
      console.log(
        "Default value first 300 chars:",
        mod.default.substring(0, 300),
      );
      return mod.default;
    }
  }

  // Если результат - строка напрямую
  if (typeof result === "string") {
    console.log("Result is string, first 300 chars:", result.substring(0, 300));
    return result;
  }

  // Если результат - это функция (компонент React), значит MDX загружен не как raw
  // Нужно использовать другой способ загрузки
  if (typeof result === "function") {
    console.error(
      "MDX loaded as component, not as raw text. Need to fetch the file differently.",
    );

    // Попробуем загрузить через fetch с параметром ?raw
    try {
      const response = await fetch(`/src/content/news/${slug}.mdx?raw`);
      if (response.ok) {
        const text = await response.text();
        console.log(
          "Fetched via ?raw, first 300 chars:",
          text.substring(0, 300),
        );
        return text;
      }
    } catch (e) {
      console.error("Failed to fetch MDX via HTTP with ?raw:", e);
    }

    // Если не сработало, пробуем без параметра но с другим заголовком
    try {
      const response = await fetch(`/src/content/news/${slug}.mdx`, {
        headers: {
          Accept: "text/plain",
        },
      });
      if (response.ok) {
        const text = await response.text();
        console.log(
          "Fetched with Accept header, first 300 chars:",
          text.substring(0, 300),
        );
        return text;
      }
    } catch (e) {
      console.error("Failed to fetch MDX via HTTP with Accept header:", e);
    }
  }

  throw new Error("mdx-invalid-format");
}

type ExistingNewsItem = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags?: string[];
  cover?: string;
  coverAlt?: string;
};

const newsItems = newsIndex as ExistingNewsItem[];

function mdxToDraft(mdxSource: string, fallbackDate: string): NewsDraft {
  console.log("mdxToDraft input length:", mdxSource.length);
  console.log("mdxToDraft first 500 chars:", mdxSource.substring(0, 500));

  // Если пришел скомпилированный JS код, пытаемся извлечь весь MDX из него
  let actualMdxSource = mdxSource;
  if (
    mdxSource.includes("const MDXLayout = ") ||
    mdxSource.includes('export default "---')
  ) {
    console.log("Detected compiled MDX, attempting to extract...");

    // Ищем начало строки
    const startPatterns = [/const MDXLayout = "/, /export default "/];

    let startMatch: RegExpExecArray | null = null;
    let startIndex = -1;

    for (const pattern of startPatterns) {
      const match = pattern.exec(mdxSource);
      if (match) {
        startMatch = match;
        startIndex = match.index + match[0].length;
        break;
      }
    }

    if (startMatch && startIndex !== -1) {
      console.log("Found start at index:", startIndex);

      // Извлекаем строку, учитывая escaped кавычки
      let endIndex = startIndex;
      let escaped = false;

      while (endIndex < mdxSource.length) {
        const char = mdxSource[endIndex];

        if (escaped) {
          // Пропускаем любой символ после \
          escaped = false;
        } else if (char === "\\") {
          // Следующий символ будет escaped
          escaped = true;
        } else if (char === '"') {
          // Нашли незакрытую кавычку - конец строки
          break;
        }

        endIndex++;
      }

      const extractedString = mdxSource.substring(startIndex, endIndex);
      console.log("Extracted string length:", extractedString.length);
      console.log(
        "First 300 chars of extracted:",
        extractedString.substring(0, 300),
      );
      console.log(
        "Last 100 chars of extracted:",
        extractedString.substring(Math.max(0, extractedString.length - 100)),
      );

      // Декодируем escaped строку используя JSON.parse
      try {
        actualMdxSource = JSON.parse(`"${extractedString}"`);
        console.log("Successfully decoded via JSON.parse");
        console.log("Decoded MDX length:", actualMdxSource.length);
        console.log(
          "Decoded MDX first 500 chars:",
          actualMdxSource.substring(0, 500),
        );
      } catch (e) {
        console.error("JSON.parse failed:", e);
        // Если JSON.parse не сработал, используем ручную замену
        console.log("Using manual replacement");
        actualMdxSource = extractedString
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\\\/g, "\\");
        console.log(
          "Manually decoded MDX first 500 chars:",
          actualMdxSource.substring(0, 500),
        );
      }
    } else {
      console.log("No start pattern found in compiled code");
    }
  }

  const { data, content } = matter(actualMdxSource);

  console.log("matter parsed data:", data);
  console.log("matter parsed content length:", content.length);
  console.log(
    "matter parsed content first 300 chars:",
    content.substring(0, 300),
  );

  const assets: DraftAsset[] = [];
  const inlineAssetMap = new Map<string, DraftAsset>();
  const blocks: EditorBlock[] = [];

  const ensureInlineAsset = (path: string, alt: string) => {
    const key = path;
    const existing = inlineAssetMap.get(key);
    if (existing) {
      if (!existing.alt && alt) {
        existing.alt = alt;
      }
      return existing.id;
    }

    const asset: DraftAsset = {
      id: crypto.randomUUID(),
      filename: path.split("/").pop() ?? path,
      dataUrl: path,
      kind: "inline",
      alt,
    };
    inlineAssetMap.set(key, asset);
    assets.push(asset);
    return asset.id;
  };

  if (typeof data.cover === "string" && data.cover) {
    assets.push({
      id: crypto.randomUUID(),
      filename: data.cover.split("/").pop() ?? "cover",
      dataUrl: data.cover,
      kind: "cover",
      alt: typeof data.coverAlt === "string" ? data.coverAlt : "",
    });
  }

  const lines = content.split("\n");
  let paragraphBuffer: string[] = [];

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) {
      return;
    }

    const text = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];
    if (text) {
      blocks.push(
        createBlock("paragraph", {
          content: text,
        }),
      );
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();

    // Пропускаем пустые строки
    if (!line) {
      flushParagraph();
      continue;
    }

    // Пропускаем import-ы
    if (line.startsWith("import ")) {
      continue;
    }

    // Пропускаем standalone JSX компоненты (без текстового контента)
    // Например: <Button>...</Button> или <Image />
    const isStandaloneJSX = line.match(/^<[A-Z][a-zA-Z0-9]*(\s|>|\/)/);
    if (isStandaloneJSX) {
      continue;
    }

    // Заголовки H2
    if (line.startsWith("## ")) {
      flushParagraph();
      blocks.push(
        createBlock("heading2", {
          content: line.slice(3).trim(),
        }),
      );
      continue;
    }

    // Заголовки H3
    if (line.startsWith("### ")) {
      flushParagraph();
      blocks.push(
        createBlock("heading3", {
          content: line.slice(4).trim(),
        }),
      );
      continue;
    }

    // Заголовки H1 (если есть)
    if (line.startsWith("# ")) {
      flushParagraph();
      blocks.push(
        createBlock("heading2", {
          content: line.slice(2).trim(),
        }),
      );
      continue;
    }

    // Изображения
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      flushParagraph();
      const [, altRaw, pathRaw] = imageMatch;
      const imageAlt = altRaw.trim();
      const imagePath = pathRaw.trim();

      let caption = "";
      let cursor = index + 1;
      while (cursor < lines.length) {
        const nextLine = lines[cursor].trim();
        if (!nextLine) {
          cursor += 1;
          continue;
        }
        const captionMatch = nextLine.match(/^\*(.*)\*$/);
        if (captionMatch) {
          caption = captionMatch[1].trim();
          index = cursor;
        }
        break;
      }

      const assetId = ensureInlineAsset(imagePath, imageAlt);
      blocks.push(
        createBlock("image", {
          content: caption,
          assetId,
        }),
      );
      continue;
    }

    // Пропускаем строки с закрывающими скобками конструкций
    // eslint-disable-next-line no-useless-escape
    if (line.match(/^[}\]\)]+[,;]?$/)) {
      continue;
    }

    // Извлекаем текстовый контент из строки, удаляя JSX теги
    let textContent = line;
    // Удаляем JSX теги вида <Tag>, </Tag>, <Tag />
    textContent = textContent.replace(/<\/?[A-Z][a-zA-Z0-9]*[^>]*>/g, " ");
    // Удаляем множественные пробелы
    textContent = textContent.replace(/\s+/g, " ").trim();

    if (textContent) {
      paragraphBuffer.push(textContent);
    }
  }

  flushParagraph();

  if (blocks.length === 0) {
    blocks.push(createBlock("paragraph"));
  }

  const meta = {
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : "",
    date: typeof data.date === "string" ? data.date : fallbackDate,
    tags: Array.isArray(data.tags)
      ? data.tags.join(", ")
      : typeof data.tags === "string"
        ? data.tags
        : "",
    coverAlt: typeof data.coverAlt === "string" ? data.coverAlt : "",
  };

  return {
    meta,
    blocks,
    assets,
  };
}

function PreviewRenderer({
  blocks,
  assets,
}: {
  blocks: EditorBlock[];
  assets: DraftAsset[];
}) {
  const assetMap = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  if (blocks.length === 0) {
    return (
      <p className={styles.previewEmpty}>
        Добавьте блоки, чтобы увидеть предпросмотр.
      </p>
    );
  }

  return (
    <div className={styles.previewSurface}>
      {blocks.map((block) => {
        if (block.type === "heading2") {
          return (
            <h2 key={block.id} className={styles.previewHeading2}>
              {block.content}
            </h2>
          );
        }

        if (block.type === "heading3") {
          return (
            <h3 key={block.id} className={styles.previewHeading3}>
              {block.content}
            </h3>
          );
        }

        if (block.type === "image") {
          if (!block.assetId) {
            return (
              <p key={block.id} className={styles.previewHint}>
                Выберите изображение для этого блока.
              </p>
            );
          }
          const asset = assetMap.get(block.assetId);
          if (!asset) {
            return (
              <p key={block.id} className={styles.previewHint}>
                Изображение недоступно. Проверьте список медиа.
              </p>
            );
          }

          const alt = asset.alt?.trim() || block.content || "Изображение";
          return (
            <figure key={block.id} className={styles.previewFigure}>
              <img src={asset.dataUrl} alt={alt} />
              {(block.content || asset.alt) && (
                <figcaption>{block.content || asset.alt}</figcaption>
              )}
            </figure>
          );
        }

        return (
          <p key={block.id} className={styles.previewParagraph}>
            {block.content}
          </p>
        );
      })}
    </div>
  );
}

export function NewsEditorPage() {
  // Получаем slug из URL параметров
  const [searchParams] = useState(
    () => new URLSearchParams(window.location.search),
  );
  const slugFromUrl = searchParams.get("slug");

  const [meta, setMeta] = useState(defaultMetaState);
  const [blocks, setBlocks] = useState<EditorBlock[]>([
    createBlock("paragraph"),
  ]);
  const [assets, setAssets] = useState<DraftAsset[]>([]);
  const inlineAssets = useMemo(
    () => assets.filter((asset) => asset.kind === "inline"),
    [assets],
  );
  const coverAsset = useMemo(
    () => assets.find((asset) => asset.kind === "cover"),
    [assets],
  );

  const [previewMdx, setPreviewMdx] = useState("");
  const [loadMessage, setLoadMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setPreviewMdx(generatePreviewMdx(blocks, assets));
  }, [blocks, assets]);

  // Автозагрузка новости при монтировании, если передан slug в URL
  useEffect(() => {
    if (slugFromUrl) {
      loadNewsFromSlug(slugFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setAssets((prev) => {
      let hasChanges = false;
      const next = prev.map((asset) => {
        if (asset.kind === "cover" && asset.alt !== meta.coverAlt) {
          hasChanges = true;
          return { ...asset, alt: meta.coverAlt };
        }
        return asset;
      });
      return hasChanges ? next : prev;
    });
  }, [meta.coverAlt]);

  const computedSlug = useMemo(
    () => slugify(meta.title || "untitled"),
    [meta.title],
  );

  const isSaveDisabled = useMemo(() => {
    if (!meta.title.trim()) {
      return true;
    }

    const inlineIds = new Set(inlineAssets.map((asset) => asset.id));
    const hasContent = blocks.some((block) => {
      if (block.type === "image") {
        return Boolean(block.assetId && inlineIds.has(block.assetId));
      }
      return block.content.trim().length > 0;
    });

    return !hasContent;
  }, [meta.title, blocks, inlineAssets]);

  const draft: NewsDraft = useMemo(
    () => ({
      meta,
      blocks,
      assets,
    }),
    [meta, blocks, assets],
  );

  const serializedDraft = useMemo(() => serializeDraft(draft), [draft]);

  function handleMetaChange(field: keyof typeof meta, value: string) {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }

  function handleBlockChange(id: string, value: string) {
    setBlocks((prev) =>
      prev.map((block) =>
        block.id === id ? { ...block, content: value } : block,
      ),
    );
  }

  function handleBlockAssetChange(id: string, assetId: string) {
    setBlocks((prev) =>
      prev.map((block) => (block.id === id ? { ...block, assetId } : block)),
    );
  }

  function handleMoveBlock(index: number, direction: "up" | "down") {
    setBlocks((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) {
        return prev;
      }
      const next = [...prev];
      const temp = next[targetIndex];
      next[targetIndex] = next[index];
      next[index] = temp;
      return next;
    });
  }

  function handleAddBlock(type: EditorBlockType) {
    if (type === "image") {
      const defaultAssetId = inlineAssets[0]?.id;
      setBlocks((prev) => [
        ...prev,
        createBlock("image", { assetId: defaultAssetId }),
      ]);
      return;
    }

    setBlocks((prev) => [...prev, createBlock(type)]);
  }

  function handleRemoveBlock(id: string) {
    setBlocks((prev) =>
      prev.length > 1 ? prev.filter((block) => block.id !== id) : prev,
    );
  }

  function handleCoverUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        return;
      }

      setAssets((prev) => [
        ...prev.filter((asset) => asset.kind !== "cover"),
        {
          id: crypto.randomUUID(),
          filename: file.name,
          dataUrl,
          kind: "cover",
          alt: meta.coverAlt,
        },
      ]);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleRemoveCover() {
    setAssets((prev) => prev.filter((asset) => asset.kind !== "cover"));
  }

  function handleInlineUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = typeof reader.result === "string" ? reader.result : "";
        if (!dataUrl) {
          return;
        }

        setAssets((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            filename: file.name,
            dataUrl,
            kind: "inline",
            alt: "",
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  }

  function handleInlineAltChange(id: string, value: string) {
    setAssets((prev) =>
      prev.map((asset) => (asset.id === id ? { ...asset, alt: value } : asset)),
    );
  }

  function handleRemoveInlineAsset(id: string) {
    setAssets((prev) => prev.filter((asset) => asset.id !== id));
    setBlocks((prev) =>
      prev.map((block) =>
        block.assetId === id ? { ...block, assetId: undefined } : block,
      ),
    );
  }

  function handleSaveDraft() {
    // Генерируем timestamp с датой и временем (YYYY-MM-DD-HHMM)
    const now = new Date();
    const dateStr = meta.date || now.toISOString().split("T")[0];
    const timeStr = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const filename = `${dateStr}-${timeStr}-${computedSlug || "draft"}.draft.json`;
    downloadDraft(filename, serializedDraft);
  }

  async function loadNewsFromSlug(slug: string) {
    setLoadMessage(null);

    try {
      let loadedDraft: NewsDraft | null = null;

      // Ищем черновик по slug (может быть с временем или без)
      const processedEntry = Object.entries(processedDraftLoaders).find(
        ([path]) => {
          const normalized = normalizeGlobPath(path);
          const fileName = normalized.split("/").pop() || "";
          // Проверяем точное совпадение или с временем (YYYY-MM-DD-HHMM-slug.draft.json)
          return (
            fileName === `${slug}.draft.json` ||
            fileName.match(
              new RegExp(
                `-\\d{4}-${slug.replace(/^\d{4}-\d{2}-\d{2}-/, "")}\\.draft\\.json$`,
              ),
            )
          );
        },
      );

      if (processedEntry) {
        const raw = await processedEntry[1]();
        loadedDraft = JSON.parse(raw) as NewsDraft;
      } else {
        for (const [path, loader] of Object.entries(processedDraftLoaders)) {
          const raw = await loader();
          const parsed = JSON.parse(raw) as NewsDraft;
          const candidateMeta = parsed.meta ?? {};
          const candidateSlug =
            candidateMeta.title && candidateMeta.date
              ? `${candidateMeta.date}-${slugify(candidateMeta.title || "")}`
              : "";

          if (candidateSlug === slug) {
            loadedDraft = parsed;
            break;
          }

          const fileName = normalizeGlobPath(path).split("/").pop() ?? "";
          const fileSlug = fileName.replace(".draft.json", "");

          // Проверяем точное совпадение или slug с временем (удаляем время из имени)
          if (
            fileSlug === slug ||
            fileSlug.replace(/-\d{4}(?=-|$)/, "") === slug
          ) {
            loadedDraft = parsed;
            break;
          }
        }
      }

      if (!loadedDraft) {
        // Используем данные из index.json напрямую
        const newsItem = newsItems.find((item) => item.slug === slug);
        if (newsItem) {
          setMeta({
            title: newsItem.title,
            description: newsItem.description,
            date: newsItem.date,
            tags: newsItem.tags?.join(", ") || "",
            coverAlt: newsItem.coverAlt || "",
          });

          // Пытаемся загрузить MDX для контента
          try {
            const rawMdx = await loadMdxFile(slug);
            loadedDraft = mdxToDraft(rawMdx, newsItem.date);
            // Перезаписываем мету из index.json (она точная)
            loadedDraft.meta = {
              title: newsItem.title,
              description: newsItem.description,
              date: newsItem.date,
              tags: newsItem.tags?.join(", ") || "",
              coverAlt: newsItem.coverAlt || "",
            };

            // Добавляем обложку из index.json если её нет в draft
            if (
              newsItem.cover &&
              !loadedDraft.assets.some((a) => a.kind === "cover")
            ) {
              loadedDraft.assets.push({
                id: crypto.randomUUID(),
                filename: newsItem.cover.split("/").pop() || "cover",
                dataUrl: newsItem.cover,
                kind: "cover",
                alt: newsItem.coverAlt || "",
              });
            }
          } catch (error) {
            console.error(
              "Failed to load MDX content, using meta only:",
              error,
            );
            // Если MDX не загрузился, создаем draft только с метаданными
            const draftAssets: DraftAsset[] = [];

            // Добавляем обложку если есть
            if (newsItem.cover) {
              draftAssets.push({
                id: crypto.randomUUID(),
                filename: newsItem.cover.split("/").pop() || "cover",
                dataUrl: newsItem.cover,
                kind: "cover",
                alt: newsItem.coverAlt || "",
              });
            }

            loadedDraft = {
              meta: {
                title: newsItem.title,
                description: newsItem.description,
                date: newsItem.date,
                tags: newsItem.tags?.join(", ") || "",
                coverAlt: newsItem.coverAlt || "",
              },
              blocks: [createBlock("paragraph")],
              assets: draftAssets,
            };
          }
        } else {
          throw new Error("News item not found in index");
        }
      }

      const metaFromDraft = loadedDraft.meta ?? {};
      console.log("Loaded draft meta:", metaFromDraft);
      console.log("Loaded draft blocks count:", loadedDraft.blocks?.length);

      setMeta({
        ...defaultMetaState,
        ...metaFromDraft,
        date: metaFromDraft.date || defaultDate,
        tags: typeof metaFromDraft.tags === "string" ? metaFromDraft.tags : "",
        coverAlt: metaFromDraft.coverAlt ?? "",
      });

      const draftBlocks = loadedDraft.blocks?.length
        ? loadedDraft.blocks
        : [createBlock("paragraph")];
      setBlocks(draftBlocks.map((block) => ({ ...block })));
      setAssets(loadedDraft.assets ?? []);

      setLoadMessage({
        type: "success",
        text: "Материал загружен. Отредактируйте контент и сохраните новый черновик.",
      });
    } catch (error) {
      console.error("Error loading:", error);
      setLoadMessage({
        type: "error",
        text: "Не удалось загрузить новость. Проверьте, что файлы синхронизированы через content:sync.",
      });
    }
  }

  return (
    <div className={styles.page}>
      <Helmet>
        <title>Редактор новостей — Denis Zablincev</title>
        <meta
          name="description"
          content="Редактор новостей: создавайте блоки, экспортируйте черновик и публикуйте."
        />
      </Helmet>

      <header className={styles.header}>
        <h1>Редактор новостей</h1>
        <p>
          Добавляйте блоки контента, экспортируйте черновик и публикуйте в
          репозитории.
        </p>
        {slugFromUrl && (
          <p className={styles.editingNote}>
            Редактирование:{" "}
            <strong>
              {newsItems.find((item) => item.slug === slugFromUrl)?.title ||
                slugFromUrl}
            </strong>
          </p>
        )}
        {loadMessage && (
          <p
            className={`${styles.loadMessage} ${
              loadMessage.type === "success"
                ? styles.loadMessageSuccess
                : styles.loadMessageError
            }`}
          >
            {loadMessage.text}
          </p>
        )}
      </header>

      <section className={styles.meta}>
        <div className={styles.field}>
          <label htmlFor="title">Заголовок</label>
          <input
            id="title"
            value={meta.title}
            onChange={(event) => handleMetaChange("title", event.target.value)}
            placeholder="Например, перезапуск дизайн-системы"
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="description">Краткое описание</label>
          <textarea
            id="description"
            value={meta.description}
            onChange={(event) =>
              handleMetaChange("description", event.target.value)
            }
            rows={3}
            placeholder="Чем полезна эта заметка и почему стоит дочитать."
          />
        </div>
        <div className={styles.inlineFields}>
          <div className={styles.field}>
            <label htmlFor="date">Дата</label>
            <input
              id="date"
              type="date"
              value={meta.date}
              onChange={(event) => handleMetaChange("date", event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="tags">Теги</label>
            <input
              id="tags"
              value={meta.tags}
              onChange={(event) => handleMetaChange("tags", event.target.value)}
              placeholder="design, process, frontend"
            />
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="cover">Обложка</label>
          <div className={styles.coverControls}>
            <input
              id="cover"
              type="file"
              accept="image/*"
              onChange={handleCoverUpload}
            />
            {coverAsset ? (
              <div className={styles.coverPreview}>
                <span className={styles.coverName}>{coverAsset.filename}</span>
                <button
                  type="button"
                  onClick={handleRemoveCover}
                  className={styles.removeButton}
                >
                  Удалить
                </button>
              </div>
            ) : (
              <span className={styles.coverHint}>
                Загрузите изображение обложки (JPG или PNG).
              </span>
            )}
          </div>
        </div>
        <div className={styles.field}>
          <label htmlFor="coverAlt">Описание обложки</label>
          <input
            id="coverAlt"
            value={meta.coverAlt}
            onChange={(event) =>
              handleMetaChange("coverAlt", event.target.value)
            }
            placeholder="Например, макет дизайн-системы на ноутбуке"
          />
        </div>
      </section>

      <section className={styles.media}>
        <div className={styles.mediaHeader}>
          <h2>Медиа</h2>
          <label className={styles.uploadButton}>
            Загрузить изображения
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleInlineUpload}
            />
          </label>
        </div>
        {inlineAssets.length === 0 ? (
          <p className={styles.mediaHint}>
            Загрузите изображения, чтобы использовать их в блоках контента.
          </p>
        ) : (
          <ul className={styles.mediaList}>
            {inlineAssets.map((asset) => (
              <li key={asset.id} className={styles.mediaItem}>
                <div className={styles.mediaPreview}>
                  <img src={asset.dataUrl} alt={asset.filename} />
                </div>
                <div className={styles.mediaInfo}>
                  <p className={styles.mediaName}>{asset.filename}</p>
                  <label className={styles.mediaLabel}>
                    Alt-текст
                    <input
                      value={asset.alt ?? ""}
                      onChange={(event) =>
                        handleInlineAltChange(asset.id, event.target.value)
                      }
                      placeholder="Описание изображения для доступности"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveInlineAsset(asset.id)}
                    className={styles.removeButton}
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.blocks}>
        <div className={styles.blocksHeader}>
          <h2>Блоки</h2>
          <div className={styles.blockActions}>
            {blockOptions.map((option) => (
              <Button
                key={option.type}
                variant="ghost"
                onClick={() => handleAddBlock(option.type)}
              >
                + {option.label}
              </Button>
            ))}
          </div>
        </div>

        <div className={styles.blockList}>
          {blocks.map((block, index) => (
            <div key={block.id} className={styles.block}>
              <div className={styles.blockHeader}>
                <span className={styles.blockTag}>
                  {index + 1}.{" "}
                  {block.type === "paragraph"
                    ? "Параграф"
                    : block.type === "heading2"
                      ? "Заголовок H2"
                      : block.type === "heading3"
                        ? "Заголовок H3"
                        : "Изображение"}
                </span>
                <div className={styles.blockActionsInline}>
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(index, "up")}
                    className={styles.orderButton}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveBlock(index, "down")}
                    className={styles.orderButton}
                    disabled={index === blocks.length - 1}
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveBlock(block.id)}
                    className={styles.removeButton}
                  >
                    Удалить
                  </button>
                </div>
              </div>
              {block.type === "image" ? (
                <div className={styles.imageFieldset}>
                  <label>
                    Файл изображения
                    <select
                      value={block.assetId ?? ""}
                      onChange={(event) =>
                        handleBlockAssetChange(block.id, event.target.value)
                      }
                    >
                      <option value="">Выберите изображение</option>
                      {inlineAssets.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.filename}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Подпись (опционально)
                    <input
                      value={block.content}
                      onChange={(event) =>
                        handleBlockChange(block.id, event.target.value)
                      }
                      placeholder="Текст под изображением"
                    />
                  </label>
                  {block.assetId &&
                    !inlineAssets.some(
                      (asset) => asset.id === block.assetId,
                    ) && (
                      <p className={styles.imageWarning}>
                        Это изображение было удалено из медиатеки.
                      </p>
                    )}
                </div>
              ) : block.type === "paragraph" ? (
                <textarea
                  value={block.content}
                  onChange={(event) =>
                    handleBlockChange(block.id, event.target.value)
                  }
                  rows={4}
                  placeholder="Текст параграфа"
                />
              ) : (
                <input
                  value={block.content}
                  onChange={(event) =>
                    handleBlockChange(block.id, event.target.value)
                  }
                  placeholder="Текст заголовка"
                />
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.preview}>
        <div className={styles.previewHeader}>
          <h2>Предпросмотр</h2>
          <p>
            Так будет выглядеть сгенерированный MDX. Ниже — код и JSON структуры
            черновика.
          </p>
          {coverAsset && (
            <p className={styles.assetsInfo}>
              Обложка будет сохранена в каталоге public/news-assets/
              {computedSlug || "draft"}.
            </p>
          )}
        </div>
        <div className={styles.previewGrid}>
          <div className={styles.previewVisual}>
            {previewMdx ? (
              <PreviewRenderer blocks={blocks} assets={assets} />
            ) : (
              <p className={styles.previewEmpty}>
                Соберите блоки, чтобы увидеть визуальный результат.
              </p>
            )}
          </div>
          <div className={styles.previewCode}>
            <h3>MDX</h3>
            <pre>{previewMdx || "Добавьте контент, чтобы увидеть MDX."}</pre>
            <h3>JSON</h3>
            <pre>{serializedDraft}</pre>
          </div>
        </div>
      </section>

      <div className={styles.saveArea}>
        <Button onClick={handleSaveDraft} disabled={isSaveDisabled}>
          Сохранить черновик
        </Button>
        <p className={styles.hint}>
          Черновик скачивается как JSON. Поместите файл в
          src/content/news/drafts и затем выполните npm run content:sync, чтобы
          сгенерировать MDX и обновить index.json.
        </p>
      </div>
    </div>
  );
}

export default NewsEditorPage;
