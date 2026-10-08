import { fail } from './editorial-push-snapshot.mjs';

// The caller supplies a staging-only Pages adapter. No production credentials or Hooks.
// Once submission is attempted, never retry it automatically: a timeout may mean accepted.
export async function promoteEditorial({ jobId, rpc, deploy, monitor }) {
  const lease = await rpc('check', [jobId]);
  if (lease.phase !== 'building') fail('promotion_reconciliation_required');
  await rpc('preparePromotion', [jobId]);
  let deployment;
  try { deployment = await deploy(lease); }
  catch {
    await monitor('uncertain', [jobId]);
    fail('deployment_outcome_unknown');
  }
  return deployment;
}

export async function confirmEditorial({ jobId, inspect, monitor }) {
  const deployment = await inspect(jobId);
  if (!deployment || !['success', 'failure'].includes(deployment.status)) fail('deployment_not_terminal');
  // Coordinator validates environment, SHA, generation, snapshot, revision and receipt.
  await monitor('settle', [jobId, deployment]);
  return deployment.status;
}
