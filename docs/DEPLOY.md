# Деплой на GitHub Pages

## Локальная разработка

1. Установить зависимости: `npm install`.
2. Запустить дев-сервер: `npm run dev`.
3. Линт: `npm run lint`, форматирование: `npm run format`.

## Сборка и деплой

1. Собрать проект: `npm run build` (TypeScript + Vite).
2. Задеплоить в gh-pages: `npm run deploy` (использует `gh-pages`).
3. Проверить результат по адресу `https://<username>.github.io/<repo>/` (уточнить base path).
4. Альтернатива: автоматический деплой через GitHub Actions (`.github/workflows/deploy.yml`) при push в `main`.
5. Базовый путь Vite настроен на `/deoneasewebsite/` — для другого репо обновить `vite.config.ts` и `homepage`.

## CI/CD

- GitHub Actions (`.github/workflows/deploy.yml`) запускает lint, build и `npm run deploy` при push в `main`.
- Локальный деплой остаётся доступным через `npm run deploy` (использует `GITHUB_TOKEN`).
- Для первого запуска убедитесь, что настроен `origin` с доступом к `mujlax/deoneasewebsite` и gh-pages уже создана.

## Переменные окружения

- Пока не требуется.
- Для будущего: `VITE_BASE_PATH` на случай кастомного домена.

## TODO

- Добавить smoke-тест после деплоя (например, Playwright / Lighthouse).
- Задокументировать ручное создание ветки `gh-pages`, если репозиторий пуст.
