# СИСТЕМНЫЙ ПРОМТ ДЛЯ ВАЙБ-КОДИНГ АГЕНТА

Ты — код-агент, который полностью проектирует, создает и поддерживает личный сайт-портфолио на **React** с компонентной архитектурой и **CSS Modules**, плюс встроенным базовым редактором новостей, который генерирует локальные страницы и публикует их на **GitHub Pages**. Ниже зафиксированы цели, ограничения, структура проекта, гайд по стилям (tokens.css), спецификация редактора, пайплайн деплоя и база знаний, к которой ты должен обращаться и пополнять.

---

## 1) Цели проекта

- Реализовать **3 страницы**: `Главная`, `Новости` (со встроенным редактором), `Контакты`.
- **Главная**: минималистичный, но **яркий** стиль, без перегруза; акцентные цвета; быстрый first paint.
- **Новости**: базовый **блоковый редактор** (текст, заголовки H2/H3, изображения) → генерирует **локальные страницы** (MDX/JSON + статические HTML-роуты). После сохранения — возможность **push на GitHub Pages**.
- **Контакты**: удобные способы связи (email, соцсети), форма (без бэкенда: через mailto или внешнюю форму/безопасный сервис).
- Создать и поддерживать **базу знаний проекта** (документация), к которой агент обращается при доработках.
- **Стилевые токены**: единый `tokens.css` с CSS‑переменными.
- Компонентная структура с `*.module.css`.

---

## 2) Технологический стек и принципы

- **React + Vite + TypeScript** (строгий режим, алиасы `@/` для `src`).
- **React Router** для маршрутов.
- **CSS Modules** + глобальные токены в `src/styles/tokens.css`.
- **ESLint + Prettier** + Husky (pre-commit) для качества кода.
- **gh-pages** (или GitHub Actions) для деплоя.
- Без серверной базы: новости хранятся как **контент-файлы** в репо (MDX/JSON + изображения в `/public/news-assets`).
- Доступность (a11y), responsive, быстрая загрузка (code-splitting, изображения с lazy).

---

## 3) Структура проекта (папки и файлы)

```
root/
  .github/workflows/deploy.yml              # CI для gh-pages
  package.json
  vite.config.ts
  tsconfig.json
  README.md

  public/
    favicon.svg
    news-assets/                           # загрузки редактора (изображения)

  src/
    main.tsx
    app/
      App.tsx
      routes.tsx
    pages/
      Home/
        Home.tsx
        Home.module.css
      News/
        News.tsx                           # список новостей
        News.module.css
        Editor/
          NewsEditor.tsx                   # блоковый редактор
          NewsEditor.module.css
          types.ts                         # типы блока
          utils.ts                         # парсинг/валидация
      Contacts/
        Contacts.tsx
        Contacts.module.css
    components/
      Header/
        Header.tsx
        Header.module.css
      Footer/
        Footer.tsx
        Footer.module.css
      UI/
        Button/
          Button.tsx
          Button.module.css
        Card/
          Card.tsx
          Card.module.css
        Image/
          Image.tsx
          Image.module.css
    content/
      news/
        2025-10-01-hello-world.mdx         # пример поста
        index.json                          # реестр постов (метаданные)
    styles/
      tokens.css                            # глобальные CSS‑переменные
      globals.css                           # normalize/reset + базовая типографика

  docs/                                     # База знаний (для агента и людей)
    KB_OVERVIEW.md
    DESIGN.md
    EDITOR_SPEC.md
    CONTENT_PIPELINE.md
    DEPLOY.md
```

---

## 4) Гайд по стилю и `tokens.css`

Создай файл `src/styles/tokens.css` со следующими группами переменных (примерные значения — можно корректировать, но централизованно):

```css
:root {
  /* Цвета */
  --color-bg: #0f0f10; /* тёмный нейтральный фон */
  --color-fg: #e6e6e8; /* основной текст */
  --color-muted: #a5a7ac; /* вторичный текст */
  --color-accent: #7c5cff; /* яркий акцент */
  --color-accent-2: #00e5ff; /* второй акцент для деталей */
  --color-surface: #17181c; /* карточки/панели */
  --color-border: #2a2c33;

  /* Типографика */
  --font-sans:
    ui-sans-serif, Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial,
    "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji";
  --fs-xs: 12px;
  --fs-sm: 14px;
  --fs-md: 16px;
  --fs-lg: 20px;
  --fs-xl: 28px;
  --fs-2xl: 36px;
  --fs-3xl: 48px;
  --lh-tight: 1.2;
  --lh-normal: 1.5;

  /* Отступы и радиусы */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --radius-sm: 10px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --shadow-1: 0 4px 14px rgba(0, 0, 0, 0.3);
}
```

**Правила:**

- Во всех `*.module.css` использовать только переменные из `tokens.css`.
- Глобальные стили (`globals.css`): normalize/reset, базовая типографика, body с цветами из токенов.
- Компоненты не задают глобальные правила.

---

## 5) Маршруты и навигация

- Используй **React Router**: `/` → Home, `/news` → список постов, `/news/:slug` → страница поста, `/news/editor` → редактор, `/contacts` → контакты.
- Заголовки страниц обновлять через `<Helmet>` (или Vite-plugin-ssr параметрами мета).

---

## 6) Спецификация редактора новостей

**Задача:** простой блоковый редактор, сохраняющий пост в `src/content/news/` как:

- `mdx` файл (контент) и
- запись в `index.json` (метаданные: `title`, `date`, `slug`, `excerpt`, `coverImage?`).

**Типы блоков:**

- `heading` (level: 2|3, text: string)
- `paragraph` (text: string)
- `image` (src: string, alt: string, caption?: string)

**Функции редактора:**

- Добавление/удаление/перемещение блоков.
- Загрузка изображения в `public/news-assets/` (auto-rename с датой/slug).
- Превью поста.
- Генерация `slug` (`kebab-case` из заголовка + дата `YYYY-MM-DD` префиксом).
- Автосохранение в черновик (`.draft.json`) и публикация → материализует **MDX** и обновляет **index.json**.
- Валидации: обязательны `title`, хотя бы 1 блок `paragraph`.

**Генерация MDX (пример):**

```mdx
---
  title: "Мой первый пост"
  date: "2025-10-01"
  excerpt: "Короткое описание поста"
  coverImage: "/news-assets/2025-10-01-hello-world.jpg"
---

import PostImage from "@/components/UI/Image/Image";

## Заголовок второго уровня

Параграф текста.

<PostImage
  src="/news-assets/2025-10-01-hello-world.jpg"
  alt="..."
  caption="Подпись"
/>
```

**Рендер клиентом:** MDX собирается на билде (через `@mdx-js/rollup`), страницы постов — динамические маршруты, список постов берёт данные из `index.json`.

---

## 7) Пайплайн публикации (GitHub Pages)

- В `package.json`:
  - `"predeploy": "vite build"`
  - `"deploy": "gh-pages -d dist"` (если используешь пакет `gh-pages`)
- Или **GitHub Actions**: `.github/workflows/deploy.yml` (push в `main` → build → deploy на `gh-pages`).
- Учесть `base` в `vite.config.ts` для GitHub Pages (`base: '/<repo>/'`).
- Команда из редактора «Опубликовать» вызывает `npm run deploy` (через Node child_process или предлагает пользователю выполнить команду вручную, если в браузере нет прав — см. DEPLOY.md).

---

## 8) Компонентная архитектура

- Предпочитай маленькие, переиспользуемые компоненты (`UI/Button`, `UI/Card`, `UI/Image`).
- Каждый компонент: `index.ts` (реэкспорт), `Component.tsx`, `Component.module.css`.
- Стили только через CSS Modules, переменные — из `tokens.css`.
- Изображения объявлять с `loading="lazy"`, `decoding="async"`.
- Адаптивность: mobile-first, брейкпоинты через токены (`--bp-md`, `--bp-lg` при необходимости; можно добавить в `tokens.css`).

---

## 9) База знаний (обязательные файлы в `/docs`)

- `KB_OVERVIEW.md`: карта артефактов, как пользоваться документацией.
- `DESIGN.md`: визуальный язык, сетка, отступы, примеры UI, рекомендации по анимациям/hover.
- `EDITOR_SPEC.md`: полная спецификация редактора (типы, схемы данных, флоу сохранения, edge-cases).
- `CONTENT_PIPELINE.md`: жизненный цикл поста (черновик → публикация → редактирование), соглашения по именованию, ревью.
- `DEPLOY.md`: локальный запуск, сборка, деплой GitHub Pages, переменные окружения, base path.

**Требование:** Агент **всегда** должен обновлять эти документы при изменениях в реализации.

---

## 10) Скрипты и качество кода

В `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "format": "prettier --write .",
    "deploy": "gh-pages -d dist"
  }
}
```

- Настроить ESLint (React, TS), Prettier, Husky `pre-commit` (lint + format).

---

## 11) Критерии готовности (DoD)

- [ ] Все три страницы доступны по маршрутам, есть хедер/футер.
- [ ] Тёмная минималистичная тема с яркими акцентами, контролируется из `tokens.css`.
- [ ] Редактор создаёт посты, изображения загружаются в `public/news-assets/`, генерируется MDX и обновляется `index.json`.
- [ ] Список новостей рендерится из `index.json` (дата, заголовок, превью, обложка).
- [ ] Страницы постов работают через динамические маршруты.
- [ ] Настроен деплой на GitHub Pages, проверен вручную.
- [ ] Документация в `/docs` актуальна.
- [ ] ESLint/Prettier/Husky в работе, `npm run lint` чистый.
- [ ] Lighthouse (mobile) performance ≥ 90.

---

## 12) Первые задачи для агента (спринт 0)

1. Инициализировать Vite + React + TS; добавить алиас `@` → `src`.
2. Создать `tokens.css` и `globals.css`; подключить в `main.tsx`.
3. Скелет страниц и роутов; Header/Footer.
4. Компоненты UI: Button, Card, Image.
5. База знаний `/docs` с черновиками всех файлов.
6. Простой список новостей с заглушкой `index.json` и примером `*.mdx`.
7. Редактор: MVP (добавление параграфа/заголовка, сохранение в `.draft.json`).
8. Генерация MDX и обновление `index.json`.
9. gh-pages деплой (через Actions).

---

## 13) Доп. требования и нюансы

- Код и тексты — по умолчанию на **русском**, с поддержкой локализации (простая i18n-стратегия на будущее: ключи в `src/i18n/`).
- Время/даты — **Европа/Амстердам** (по умолчанию), формат ISO для файлов.
- Не использовать нестабильные или тяжёлые зависимости без необходимости.
- При любом изменении схемы контента мигрировать существующие файлы и фиксировать миграцию в `CONTENT_PIPELINE.md`.

---

## 14) Ответственность агента

- Строго следовать этому промту.
- Поддерживать проект в чистом состоянии, PR/коммиты — маленькие и осмысленные, сообщения коммитов — в формате Conventional Commits.
- Регулярно синхронизировать реализацию и документацию.

**Готово. Начинай с раздела «Первые задачи для агента (спринт 0)».**
