/**
 * Нормализует путь для работы с базовым путем GitHub Pages
 * Добавляет базовый путь к абсолютным путям (начинающимся с /)
 */
export function normalizePath(path: string): string {
  // Если путь уже начинается с базового пути, возвращаем как есть
  const base = import.meta.env.BASE_URL;

  if (!path) {
    return path;
  }

  // Если путь абсолютный (начинается с /), добавляем базовый путь
  if (path.startsWith("/") && !path.startsWith(base)) {
    return `${base}${path.slice(1)}`;
  }

  // Если путь уже содержит базовый путь или относительный, возвращаем как есть
  return path;
}
