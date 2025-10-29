import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import remarkFrontmatter from "remark-frontmatter";
import { remarkRemoveFrontmatter } from "./src/plugins/remark-remove-frontmatter";

const basePath =
  process.env.NODE_ENV === "production" ? "/deoneasewebsite/" : "/";

// https://vite.dev/config/
export default defineConfig({
  base: basePath,
  plugins: [
    // Плагин для обработки .mdx?raw - возвращает сырой текст
    {
      name: "mdx-raw",
      enforce: "pre",
      async load(id) {
        // Обрабатываем только .mdx файлы с ?raw
        if (id.includes(".mdx") && id.includes("?raw")) {
          // Читаем файл напрямую
          const fs = await import("fs/promises");
          const path = await import("path");
          // Убираем query параметры для получения реального пути
          const filePath = id.split("?")[0];

          // Проверяем разные варианты пути (абсолютный или относительный от корня проекта)
          let actualPath = filePath;
          if (!path.isAbsolute(filePath)) {
            actualPath = path.resolve(__dirname, filePath);
          }

          try {
            const content = await fs.readFile(actualPath, "utf-8");
            console.log("Successfully loaded MDX raw:", actualPath);
            // Возвращаем как экспорт строки
            return {
              code: `export default ${JSON.stringify(content)}`,
              map: null,
            };
          } catch (error) {
            console.error("Failed to read MDX file:", actualPath, error);
            // Не бросаем ошибку, пусть обработается стандартным образом
            return null;
          }
        }
      },
    },
    mdx({
      remarkPlugins: [remarkFrontmatter, remarkRemoveFrontmatter],
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
