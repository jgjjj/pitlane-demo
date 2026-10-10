# Pitlane Booking PWA — локальный запуск

## Требования

- Node.js 20+ и npm 10+
- Supabase CLI для локальной БД и Edge Functions (опционально для preview)
- Chromium для Playwright

UI-компоненты установлены по официальной shadcn/ui Vite-схеме: Tailwind v4, `components.json`, alias `@/*`, локальные Button/Card/Input/Textarea/Label и Drawer. Для Drawer зафиксирована одна ветка API — текущий Base UI (`@base-ui/react`, `render`, `swipeDirection`); Vaul props не используются. Astryx подключён через `Theme` + `neutralTheme` и официальные CSS exports.

```bash
cp .env.example .env.local
npm install
npm run tenant:validate
npm run dev
```

После изменения Astryx/shadcn зависимостей обязательно выполните `npm install` в Node 22.13+ окружении: это синхронизирует lockfile и скачает `@astryxdesign/*`, `@base-ui/react` и `@stylexjs/stylex`.

Preview-режим работает без Supabase: конфигурации загружаются из `public/tenants/*/business.json`, а записи явно сохраняются в localStorage только для демонстрации. Для production tenant должен иметь `mode: "live"`, иначе UI не делает вид, что есть backend-интеграция.

## Supabase

```bash
supabase start
supabase db reset
supabase functions serve --env-file .env.local
supabase secrets set LLM_BASE_URL=... LLM_API_KEY=... LLM_MODEL=... VAPID_PRIVATE_KEY=... VAPID_PUBLIC_KEY=... VAPID_SUBJECT=...
```

Для расписания уведомлений создайте Supabase Cron job на `send-notifications` раз в минуту. Для ICS клиент использует `booking-ics` только по access token; push не считается доставленным без VAPID и установленного PWA.

В Supabase Dashboard создайте владельца через Auth (sign up отключается на уровне проекта), затем добавьте его `user_id` в `tenant_memberships`. Публичного owner signup в приложении нет. Cron запускает `send-notifications` каждую минуту; функция берет lease из `notification_jobs`, дедуплицирует по `dedupe_key`, а без VAPID честно оставляет push пропущенным.

## Публикация tenant

```bash
npm run tenant:new -- oxide-copy
npm run tenant:validate -- oxide-copy
npm run tenant:publish -- graphite
npm run tenant:verify -- graphite
npm run build
```

`tenant:publish` генерирует `public/manifests/<slug>.webmanifest`; приложение также выбирает manifest и метаданные по текущему slug. Vite build генерирует статические HTML-shell файлы в `dist/s/<slug>/index.html`, поэтому Cloudflare Pages не требует wildcard `_redirects` и не попадает в redirect loop. Для разных scope в service worker используйте отдельный deployment/worker scope; один общий build не смешивает данные благодаря `tenant_id` в серверной схеме.

Buyer/demo distribution is documented in [SHARE-WITH-BUYERS.md](./SHARE-WITH-BUYERS.md).

## Интеграции

Ключи `SUPABASE_SERVICE_ROLE_KEY`, LLM и VAPID никогда не попадают в `VITE_*` переменные. LLM вызывается только в `owner-ai`; до ответа о расписании он выполняет server-owned tool. При отсутствии LLM запись продолжает работать. iCalendar — дополнительный канал; push требует установленного PWA и VAPID, обычная вкладка iPhone не получает обещанный push.
