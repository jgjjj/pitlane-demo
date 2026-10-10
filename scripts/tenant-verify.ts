import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readTenant, root } from './tenant-utils';

const slug = process.argv[2];
if (!slug) throw new Error('Usage: npm run tenant:verify -- <slug>');
const tenant = await readTenant(slug);
for (const asset of [tenant.hero, ...tenant.services.map((service) => service.image), tenant.icon, tenant.maskableIcon, tenant.appleTouchIcon, ...(tenant.startupAssets ?? [])].filter((asset): asset is string => Boolean(asset))) if (asset.startsWith('/')) await access(resolve(root, 'public', asset.slice(1)));
await access(resolve(root, 'public', 'manifests', `${slug}.webmanifest`)).catch(() => { throw new Error('Manifest missing. Run tenant:publish first.'); });
const manifest = JSON.parse(await readFile(resolve(root, 'public', 'manifests', `${slug}.webmanifest`), 'utf8')) as { id: string; start_url: string; scope: string; theme_color: string };
if (manifest.id !== `/s/${slug}/` || manifest.start_url !== `/s/${slug}` || manifest.scope !== `/s/${slug}/` || manifest.theme_color !== tenant.accent) throw new Error('Manifest tenant metadata mismatch');
console.log(`✓ ${slug}: assets, manifest and tenant metadata verified`);
