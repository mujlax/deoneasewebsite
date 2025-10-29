/**
 * Нормализует путь для работы с базовым путем GitHub Pages
 * Добавляет базовый путь к абсолютным путям (начинающимся с /)
 */
export function normalizePath(path: string): string {
  const base = import.meta.env.BASE_URL;

  if (!path || typeof path !== "string") {
    return path;
  }

  // Нормализуем base - убираем trailing slash если есть
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;

  // Если путь уже начинается с базового пути, возвращаем как есть
  if (path.startsWith(normalizedBase)) {
    return path;
  }

  // Если путь абсолютный (начинается с /), добавляем базовый путь
  if (path.startsWith("/")) {
    return `${normalizedBase}${path}`;
  }

  // Если путь относительный и base не пустой, добавляем base
  if (normalizedBase && normalizedBase !== "/") {
    // Для относительных путей добавляем base + /
    return `${normalizedBase}/${path}`;
  }

  // Если base = "/" или пустой, возвращаем как есть
  return path;
}
