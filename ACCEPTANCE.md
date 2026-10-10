# Acceptance

## Реализовано в репозитории

- React 19 + TypeScript strict + Vite, общий tenant-aware build и Cloudflare Pages fallback.
- Мобильный тёмный интерфейс, CSS custom property акцента из конфигурации, safe-area bottom navigation, `prefers-reduced-motion`, loading/error/empty/success состояния ключевых экранов.
- Клиентский preview flow: услуга, дата, время, контакты, подтверждение, access URL, кабинет с изоляцией localStorage по slug.
- Live flow вызывает `create-booking` Edge Function; цена, tenant, длительность, ресурс и доступ контролируются SQL.
- Две явно разные demo-конфигурации без названий бизнеса в `src`; конфиг и изображения — pipeline input.
- Миграция с composite tenant FKs, EXCLUDE для booking/block occupancy, транзакционными create/reschedule/cancel, hash токена, RLS/grants, usage counters, payments/statistics и notification outbox.
- Edge Functions: create booking with runtime timezone conversion, manage booking, owner AI с отдельным tool scope/budget claim, notification lease worker, ICS endpoint.
- Astryx `Theme`/neutral CSS/`Button`/`BottomSheet` подключены по документации версии `0.6.7`; shadcn Drawer зафиксирован на Base UI API.
- tenant:new/validate/publish/verify, manifests, seed, `.env.example`, SETUP и clone guide.
- Unit/contract tests и Playwright flow добавлены.

## Проверки, выполненные в этой среде

Статический аудит файлов и структуры выполнен. В текущем агентском shell нет доступного Node runtime (`node` из `node_modules/.bin` не запускается), поэтому автоматические `npm` проверки и Supabase runtime не запускались. `package-lock.json` обновлён только по root-метаданным; после установки зависимостей его нужно синхронизировать командой `npm install`.

## Остающиеся интеграционные проверки

- `npm install`, `npm run build`, `npm test`, `npm run test:e2e` на машине с Node.js.
- `supabase db reset` и реальные PostgreSQL concurrency/RLS проверки: два ресурса, многодневная занятость, EXCLUDE block, перенос без потери исходной брони, историческая цена, платежи, outbox lease/dedupe.
- `npm install` должен получить Astryx `core/theme-neutral/cli`, Base UI и `@stylexjs/stylex`; CLI Astryx требует Node >=22.13.
- До получения внешнего runtime/credentials не считаются подтверждёнными: реальная доставка push, live LLM, Supabase Cron, Cloudflare Pages и standalone PWA на устройствах.
- Supabase Auth magic-link с реальным owner membership.
- Реальный LLM provider, tool loop и бюджет счётчика.
- VAPID/Web Push, Supabase Cron, ICS delivery и standalone deep-link на физических iOS/Android устройствах.
- Cloudflare Pages deployment и проверка HTTPS/service-worker scope.

Эти проверки не помечены как успешные без соответствующего runtime и credentials.
