import { spawnSync } from 'node:child_process';
for (const name of ['sector-ssg-generator', 'collections-ssg', 'fetch-json', 'casos-cms-source-of-truth', 'static-menu-packs', 'editorial-build']) {
  const result = spawnSync(process.execPath, [`tests/${name}-simulation.mjs`], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
