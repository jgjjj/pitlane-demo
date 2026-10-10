import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { VitePWA } from 'vite-plugin-pwa';

function tenantHtmlShells() {
  return { name: 'tenant-html-shells', apply: 'build' as const, async closeBundle() {
    const publicRoot = path.resolve(__dirname, 'public/tenants'); const distRoot = path.resolve(__dirname, 'dist'); const source = await readFile(path.resolve(distRoot, 'index.html'), 'utf8');
    for (const entry of await readdir(publicRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const config = JSON.parse(await readFile(path.resolve(publicRoot, entry.name, 'business.json'), 'utf8')) as { slug: string; name: string; description: string; accent: string; icon?: string; appleTouchIcon?: string };
      const icon = config.icon ?? '/icons/icon.svg'; const apple = config.appleTouchIcon ?? '/icons/apple-touch-icon.svg';
      const html = source.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(config.name)} · Онлайн-запись</title>`).replace(/<meta name="theme-color" content="[^"]*" \/>/, `<meta name="theme-color" content="${config.accent}" />`).replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(config.description)}" />`).replace(/href="\/icons\/icon\.svg"/, `href="${icon}"`).replace(/href="\/icons\/apple-touch-icon\.svg"/, `href="${apple}"`).replace('</head>', `    <link rel="manifest" href="/manifests/${config.slug}.webmanifest" />\n  </head>`);
      for (const route of ['', 'book', 'owner']) {
        const output = path.resolve(distRoot, 's', config.slug, route);
        await mkdir(output, { recursive: true });
        await writeFile(path.resolve(output, 'index.html'), html);
      }
    }
  } };
}
function escapeHtml(value: string) { const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }; return value.replace(/[&<>"']/g, (char) => entities[char] ?? char); }

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({ registerType: 'autoUpdate', injectRegister: false, strategies: 'injectManifest', srcDir: 'src', filename: 'sw.ts', manifest: false, injectManifest: { globPatterns: ['**/*.{js,css,html,svg,png,woff2}'] } }), tenantHtmlShells()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: { port: 5173 },
  build: { sourcemap: true }
});
