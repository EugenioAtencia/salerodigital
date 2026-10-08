import { spawnSync } from 'node:child_process';
// Explicit staging Build command. npm install never starts this pipeline.
if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === 'codex/cms-auto-deploy') {
  const result = spawnSync(process.execPath, ['scripts/build-editorial-ssg.mjs', '--snapshot-check'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}

// Temporary diagnostic Preview, restricted to this branch and staging project.
if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === 'codex/fix-revision-before-production'
  && new URL(process.env.CF_PAGES_URL).hostname.endsWith('.salerodigital-staging.pages.dev')) {
  await import('./revision-transport-probe.mjs');
  const result = spawnSync(process.execPath, ['scripts/build-editorial-ssg.mjs'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
