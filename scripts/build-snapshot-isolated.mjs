// Local/staging preparation only; never wired to production Pages in this phase.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { retryEditorial } from './lib/editorial-push-retry.mjs';
import { stagingCommand } from './lib/editorial-push-http.mjs';
import { buildSnapshotArtifacts } from './lib/editorial-snapshot-artifacts.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
try {
  const output = process.argv[2], jobId = process.env.SALERO_BUILD_JOB_ID, codeSha = process.env.SALERO_CODE_SHA;
  if (!output || !jobId || !codeSha || !process.env.SALERO_BUILDER_KEY || !process.env.SALERO_SNAPSHOT_KEY || !process.env.SALERO_COORDINATOR_URL) throw new Error('build_configuration');
  const test = spawnSync(process.execPath, ['scripts/test-rebotica-editorial.mjs'], { cwd: root, stdio: 'inherit' });
  if (test.status !== 0) throw new Error('critical_tests');
  const invoke = (operation, args) => retryEditorial(() => stagingCommand({ url: process.env.SALERO_COORDINATOR_URL, role: 'builder', operation, args, key: process.env.SALERO_BUILDER_KEY }));
  const expected = process.env.SALERO_EXPECTED_GENERATION ? Number(process.env.SALERO_EXPECTED_GENERATION) : null;
  await invoke('claim', [jobId, codeSha, expected]);
  const check = id => invoke('check', [id]);
  const lease = await check(jobId);
  const result = await buildSnapshotArtifacts({ root, output, packet: lease.packet, key: process.env.SALERO_SNAPSHOT_KEY, jobId, check, codeSha, tests: 'passed', scope: 'rebotica', branch: process.env.SALERO_CODE_BRANCH || 'codex/rebotica-editorial-staging' });
  console.log(JSON.stringify({ prepared: true, publicationAuthorized: false, generation: result.receipt.generation, counts: result.receipt.counts, pages: result.files.length }));
} catch (error) {
  console.error(JSON.stringify({ stage: 'isolated_snapshot_build', error: /^[a-z_]{1,60}$/.test(error.message || '') ? error.message : 'build_failed', publicationAuthorized: false }));
  process.exitCode = 1;
}
