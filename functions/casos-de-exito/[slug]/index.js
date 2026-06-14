import { handleCasoRequest } from '../../_shared/caso-renderer-static.js';
import { handleCaseDetailShell } from '../../_shared/case-detail-shell-v2.js';

export async function onRequest(context) {
  const slug = String(context.params.slug || '').split('/')[0];

  if (slug === 'muebles-sarria') {
    return handleCasoRequest(context);
  }

  return handleCaseDetailShell();
}
