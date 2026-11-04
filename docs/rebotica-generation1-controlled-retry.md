# Generación 1: preparación del segundo intento (sin ejecución remota)

Esta preparación sustituye la secuencia histórica de `rebotica-generation1-recovery.md`: el snapshot YA fue aceptado y el primer job terminó en fallo de Pages Functions. No repetir begin, offer ni notify del job terminal.

## Identidad conservada y evidencia

- Batch: `synthetic-1791535467351`.
- Generación: `1`.
- Snapshot GitHub: `1edae8b2a43910ee25d931cc752425ced209e5e2`.
- SHA-256: `4018dce46674a3c5c64c63599481b2310430fa6d97591b2329ed0fabfb798d64`.
- Counts: 4 servicios, 3 sectores, 2 casos, 2 artículos.
- Primer job: `blog-6c6485f279305a2e5a0d2c38cba3ca585358d7d1fc926e73f42067d5266fe8b3`.
- Run anterior: `37955506227`.
- Deployment fallido: `6066d6c1-e89a-4ce7-b441-dba7d672ffff`.

La evidencia local conservada del cierre anterior registra `generation=1`, `active=null`, `published=null`, `jobStatus=failure`. No sustituye una nueva lectura del journal remoto: antes de ejecutar habrá que confirmar los mismos campos, head y locator GitHub. El paquete original privado se ha revalidado localmente por HMAC y hash sin imprimir firma ni secretos.

## Segundo intento explícito

Nuevo job previsto:

`blog-6c6485f279305a2e5a0d2c38cba3ca585358d7d1fc926e73f42067d5266fe8b3-r2`

La operación HMAC `editor/prepareRetry` recibe `[previousJobId, 1, snapshotId, previousDeploymentId]`. Solo registra una autorización durable en `retryAttempts`; no almacena snapshots, no abre batches, no dispara Actions ni crea deployments. El adaptador existente la ejecuta dentro de `transactionSync`, sin migración ni reinicio de SQLite.

Exige head vigente, sin edición ni publicación activa/ambigua, predecesor en `failure` con deployment exacto y notificación confirmada. Conserva jobs, notifications y registros del promotor anteriores. La autorización contiene batch, generación, snapshotId, hash, código y enlace al intento fallido. Un reenvío idéntico de preparación tras pérdida de ACK retorna la misma identidad; un cambio de código produce conflicto. Solo se implementa este segundo intento, no una cadena automática de intentos posteriores.

`notify` admite el nuevo ID únicamente si existe esta autorización y sigue vigente. El job terminal original se rechaza. `claim` rechaza sufijos de reintento no autorizados. Los roles builder, monitor y promotor no pueden preparar reintentos.

## Duplicados, concurrencia y resultados inciertos

- Los nonces HMAC se persisten; un replay se rechaza.
- Claim idempotente mantiene una sola lease activa. Otro workflow run no puede adquirir el artefacto ya asociado al intento.
- OIDC sigue fijado al SHA de los workflows reutilizables y al repositorio privado autorizado; Pages Edit permanece solo en el promotor, con destino fijo `salerodigital-staging`.
- Antes del POST no idempotente de Pages se persiste `creation_started`. Perder su ACK o reiniciar el promotor no repite el POST: se inspecciona Pages por identidad del nuevo job.
- El monitor puede perder el ACK después de settle. El coordinador guarda un digest del resultado terminal completo: el mismo resultado se reconcilia idempotentemente; un resultado distinto se rechaza. Los terminales antiguos sin digest permanecen intactos.
- Una publicación ambigua mantiene el bloqueo. No se autoriza otro intento mientras esté activa ni tras un éxito de la misma generación, aunque cambie el código.
- Antes y después del build/upload se comprueba head. Una edición posterior invalida el intento; la promoción bloquea ediciones hasta el resultado terminal.

No se promete entrega exactamente una vez de repository_dispatch ni disponibilidad automática ante una caída permanente. Un ACK ambiguo obliga a inspeccionar antes de repetir. La seguridad frente a doble creación prevalece sobre desbloquear a ciegas.

## Empaquetado y contenido

La corrección de `18ed37680806ab6b7bb44f077c33ef557104ff7f` se conserva: el MIME de Wrangler se envía como `_worker.bundle`, no como código JavaScript `_worker.js`. Las pruebas compilan las Functions reales, validan cada módulo del bundle final, serializan el formulario de despliegue y ejecutan el módulo con workerd local. No se modifican renderers, páginas ni contenido editorial.

El recibo y el digest del NUEVO artefacto deben regenerarse con el nuevo job y el SHA final aprobado. No reutilizar el digest del artefacto del intento fallido: hay metadatos nuevos y Wrangler puede variar sus delimitadores. El SHA-256 del snapshot editorial permanece idéntico.

## Secuencia pendiente: requiere autorización, no ejecutada

1. Aprobar el nuevo commit local. Leer main/producción, las exclusiones Git de ambos proyectos Pages, journal del coordinador y registro del promotor antiguo. Exigir generación 1 vigente, sin window/active/published, primer job `failure`, deployment antiguo inequívocamente `failure`, y locator exactamente en el commit/hash autorizados. Si falta evidencia o hay ambigüedad, detenerse.
2. Con Actions/READY deshabilitados, promotor OFF y EDITOR_KEY ausente, publicar únicamente la rama autorizada. Confirmar exclusión exacta de esa rama en ambos Pages antes del push; no generar deployments Git.
3. Alinear coordinador CODE_SHA, promotor CODE_SHA/TRUSTED_WORKFLOW_SHA, dispatcher uses@SHA y SALERO_CODE_SHA con el NUEVO commit aprobado. Conservar namespaces/SQLite y secretos. Confirmar ausencia de Pages Edit en Actions, OIDC, cuotas y presupuesto $0; no repetir pruebas completas.
4. Habilitar temporalmente solo el acceso editorial necesario. Ejecutar UNA prepareRetry autenticada con los argumentos anteriores. Leer el journal y comprobar la identidad `-r2` y que el terminal antiguo no ha cambiado. Una confirmación ambigua obliga a leer, no a ejecutar notify.
5. Solo tras aceptación durable, habilitar temporalmente el workflow autorizado y promotor de staging. Emitir UNA notify para el job `-r2`, generation=1. No ejecutar begin, offer, workflow_dispatch adicional ni despliegue manual. No volver a notificar el job original.
6. Registrar run ID. Exigir build PASS, `_worker.bundle` correcto, manifest/digest íntegros, OIDC autorizado y fences vigentes. Verificar un único deployment por identidad `-r2`, success, recibo con job/código nuevo y snapshot/generación originales. Comprobar HTML inicial, SEO y noindex en staging.
7. Cerrar READY/Actions/promotor, retirar acceso editorial temporal, conservar snapshot, journal y ambos intentos. Comprobar producción intacta. Si falla, cerrar, conservar evidencias y no repetir sin nueva autorización.

## Validación local

Node 22.16.0:

- `scripts/test-rebotica-editorial.mjs`: PASS; incluye sectorial, colecciones (78), middleware/schema, fetch JSON, casos, menús y suites editoriales anteriores.
- `tests/editorial-publication-retry-simulation.mjs`: 21 PASS, incluyendo autorización, estado antiguo compatible, reinicio, ACK perdido, identidad/release, roles/replay, obsolescencia, propiedad del workflow y doble publicación.
- `integrations/cloudflare/push-staging/test.mjs`: 40 PASS en workerd + SQLite locales; incluye persistencia de autorización del reintento tras reinicio.
- `integrations/cloudflare/push-staging/test-promoter.mjs`: 9 PASS en runtime local y SQLite.
- `tests/editorial-pages-functions-packaging.mjs`: 8 PASS (incluido en suite principal).
- Paquete original: HMAC/SHA-256/counts válidos, sin cambios.

Riesgos pendientes: la prueba real del bundle corregido y del nuevo job sigue pendiente; la evidencia remota debe releerse; el token Pages Edit conserva alcance de cuenta y su compromiso en el promotor sigue siendo un riesgo residual. No se han creado recursos, dependencias nuevas, generaciones ni deployments remotos durante esta preparación.
