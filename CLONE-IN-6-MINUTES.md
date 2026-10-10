# Clone in 6 minutes

1. Установите Node.js 20+.
2. Выполните `npm install`.
3. Скопируйте `.env.example` в `.env.local`.
4. Запустите `npm run tenant:validate && npm run dev`.
5. Откройте `/s/graphite` или `/s/oxide`.
6. Для production: `supabase db reset`, добавьте secrets и выполните `npm run build`.

Для нового бизнеса: `npm run tenant:new -- <slug>`, замените JSON и изображения, затем запустите четыре tenant-команды из `package.json`.
