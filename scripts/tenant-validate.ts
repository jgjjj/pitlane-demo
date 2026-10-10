import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { readTenant, tenantRoot } from './tenant-utils';

const requested = process.argv[2];
const slugs = requested ? [requested] : (await readdir(tenantRoot, { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name);
for (const slug of slugs) {
  const tenant = await readTenant(slug);
  if (tenant.slug !== slug) throw new Error(`${slug}: slug mismatch`);
  for (const service of tenant.services) if (service.image.startsWith('/') && service.image !== `/tenants/${slug}/${service.image.split('/').pop()}`) throw new Error(`${slug}: invalid asset path ${service.image}`);
  console.log(`✓ ${slug}: ${tenant.services.length} services, ${tenant.resources.length} resources, ${tenant.mode}`);
}
