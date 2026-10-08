// Explicit local-only runner; deliberately not wired into npm install or Pages.
import { spawnSync } from 'node:child_process';
const option = process.argv.find(arg => arg.startsWith('--php='));
const php = option?.slice(6) || 'php';
const version = spawnSync(php, ['-r', 'echo PHP_VERSION;'], { encoding: 'utf8' });
if (version.status !== 0) throw new Error('PHP CLI unavailable; pass --php=/path/to/php');
console.log(`Phase 1 local tests: Node ${process.version}; PHP ${version.stdout}`);
for (const [binary, args] of [[php, ['-d', 'pcre.jit=0', 'tests/editorial-push-exporter-simulation.php']],
  [process.execPath, ['tests/editorial-push-simulation.mjs', `--php=${php}`]]]) {
  const result = spawnSync(binary, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
