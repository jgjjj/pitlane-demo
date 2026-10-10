# Share With Buyers

`localhost` cannot be opened by buyers. Use a Cloudflare Pages preview deployment for product demonstrations, then use a production deployment after Supabase is configured.

## Demo preview

1. Create a GitHub repository and push this folder.
2. Open Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the repository.
4. Set:

   ```text
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Node.js version: 22.13.0 or newer
   ```

5. Add Cloudflare environment variables for the preview build only when you have a Supabase project:

   ```text
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_DEFAULT_TENANT_SLUG=graphite
   ```

6. Deploy. Cloudflare gives a URL like `https://<project>.pages.dev`.

Buyer demonstration URLs:

```text
https://<project>.pages.dev/s/graphite
https://<project>.pages.dev/s/oxide
https://<project>.pages.dev/s/graphite/owner
```

Both bundled demos stay in `preview` mode, use clearly local demo data and do not send real notifications.

## Branded demo domain

For a buyer-specific demo, create a new tenant:

```bash
npm run tenant:new -- buyer-demo
# edit public/tenants/buyer-demo/business.json and its images
npm run tenant:validate -- buyer-demo
npm run tenant:publish -- buyer-demo
npm run tenant:verify -- buyer-demo
npm run build
```

The new buyer tenant gets its own URL without replacing GRAPHITE or OXIDE:

```text
https://<project>.pages.dev/s/buyer-demo
```

## Production before sharing booking links

Do not present preview localStorage bookings as production. Before accepting real customer bookings:

1. Create/link a Supabase project.
2. Apply migrations and seed:

   ```bash
   supabase db push
   supabase db reset # local development only
   ```

3. Deploy Edge Functions:

   ```bash
   supabase functions deploy create-booking
   supabase functions deploy manage-booking
   supabase functions deploy owner-ai
   supabase functions deploy send-notifications
   supabase functions deploy booking-ics
   ```

4. Add Cloudflare/Supabase env and secrets from `.env.example`.
5. Publish tenant config to runtime with `SUPABASE_SERVICE_ROLE_KEY` present locally.
6. Set the tenant `mode` to `live` only after Auth membership, notifications, availability and booking flows have been verified.

## Short-term sharing from a laptop

For a temporary in-person demo use Cloudflare Tunnel or another tunnel provider, but do not use it as production hosting. A Pages URL is better for buyers: stable HTTPS, PWA support, correct deep links and no dependency on your laptop staying online.
