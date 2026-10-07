import { spawnSync } from 'node:child_process';
// Temporary 2A bootstrap: Pages installs this dependency-free package before its
// empty build command. No project settings, production code or secrets change.
if (process.env.CF_PAGES === '1' && process.env.CF_PAGES_BRANCH === 'codex/cms-auto-deploy') {
  const result = spawnSync(process.execPath, ['scripts/build-editorial-ssg.mjs', '--snapshot-check'], { stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
