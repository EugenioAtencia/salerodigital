# Preparación de recuperación idempotente — generación 1

Preparación realizada el 2026-10-09, desde codex/rebotica-editorial-staging, sin ejecutar recuperación remota.

## Estado remoto confirmado mediante SELECT

Cloudflare Data Studio, namespace a0d0644e29554d3c943126cbe98e211a, instancia salero-staging-editorial, ID 33790386c3d6aa7be5b97809e69eb527bd800b43f501a0351729110d663785f8. Consultas exclusivamente SELECT sobre coordinator.id=1, proyectando campos sin nonces, firmas ni secretos.

- generation: 1.
- window y permits: batchId synthetic-1791535467351, generation 1, closed=false.
- githubIntents: misma identidad; createdAt 2026-10-09T08:44:27.712Z; lastError github_authentication; attempts=1.
- Journal sin parent, parentTree, blob, manifest, tree, commit ni confirmed.
- githubObjects, head, active, published y notifications: null/ausentes; jobs: {}.
- No referencia GitHub aceptada, build, autorización de promoción ni publicación.
- La consulta de árbol GitHub no está truncada y no contiene el snapshot ni el manifiesto esperados.

No se alteró SQLite ni se habilitó endpoint/RPC para inspeccionar. No se reinstaló EDITOR_KEY, ni se emitió begin, offer o notify.

## Paquete original

Disponible en /Users/eugenio/.codex/private/salero-editorial-staging/synthetic-packet.json, permisos 600. Paquete y claves protegidos fuera de Git; no adjuntar ni imprimir su firma. Se verificó HMAC con la clave SNAPSHOT_KEY conservada y SHA-256 sobre los bytes originales.

- batchId: synthetic-1791535467351.
- generation: 1.
- SHA-256: 4018dce46674a3c5c64c63599481b2310430fa6d97591b2329ed0fabfb798d64.
- snapshotId: sha256:4018dce46674a3c5c64c63599481b2310430fa6d97591b2329ed0fabfb798d64.
- revision: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa (fixture sintético, no revisión WordPress real).
- bytes: 3923.
- counts: servicios 4, sectores 3, casos-exito 2, posts 2.
- jobId: blog-6c6485f279305a2e5a0d2c38cba3ca585358d7d1fc926e73f42067d5266fe8b3.

Reenviar el paquete existente. No volver a exportar, serializar su body, firmar otro paquete, cambiar contenidos, abrir otro batch ni rotar SNAPSHOT_KEY.

## Alineación pendiente

Revisión corregida disponible localmente: 4bd1e46776dea16f8d6f819c284c64be9cd2c448 (incluye código de 3ff187a). Está pendiente de publicación remota y autorización de la prueba; no se ha hecho push.

Actualmente coordinador CODE_SHA, promotor CODE_SHA/TRUSTED_WORKFLOW_SHA y los reusable workflows del dispatcher remoto están fijados a ffe6feb0088e3fb403c48fb7dcb597b1d909de4b. El coordinador ya contiene la corrección HTTP desplegada durante el cierre del diagnóstico, pero su anclaje sigue siendo el antiguo. Deben alinearse todos con UNA revisión corregida aprobada, sin migrar/recrear DO ni cambiar identidad del job.

Se requieren actualizaciones del coordinador y promotor de staging, del dispatcher del repositorio privado y de la variable SALERO_CODE_SHA. Mantenerlos cerrados durante la alineación. Mantener secretos independientes, Pages Edit solo en promotor, CODE_SHA=TRUSTED_WORKFLOW_SHA y workflows uses/checkout/OIDC fijados al mismo commit. Al publicar la rama de código, impedir builds Git no autorizados usando el mecanismo CF-Pages-Skip ya comprobado; confirmar is_skipped antes de activar el circuito.

## Secuencia para una recuperación remota, todavía NO ejecutada

1. Obtener autorización para alineación y recuperación; revalidar main y producción, journal y paquete original. Si cambia generación, ventana, intención/hash, head, active o published, detenerse.
2. Publicar la revisión corregida y alinear todos los anclajes, con Actions/READY false, promotor OFF y EDITOR_KEY ausente. Verificar cuotas, presupuesto y permisos. Mantener DO y claves actuales.
3. Tras autorización de ejecución, habilitar temporalmente solo el acceso editorial de staging. Enviar UNA operación offer con el paquete original y un nonce RPC nuevo. NO llamar a begin. Un error o ACK ambiguo obliga a inspeccionar antes de otra operación; no repetir automáticamente el circuito.
4. Confirmar por SELECT que generación sigue en 1, intención confirmed=true, window=null, head coincide con snapshot/revision/counts y githubObjects[1] contiene commit/tree/blob/manifiesto verificables. Leer por commit inmutable y validar cuerpo, HMAC y hashes. Sin aceptación confirmada, no notificar.
5. Solo entonces habilitar la ejecución de staging y el promotor con sus barreras verificadas. Emitir UNA notify con el jobId fijo y generation=1. No disparar workflow_dispatch, Deploy Hook ni deploy manual además de notify.
6. Observar builder automático, checks/seal, promotor y monitor. Exigir OIDC de la revisión fijada, hash íntegro, destino exclusivamente salerodigital-staging y recibo con generación/revisión/hash/commit correctos. Ante timeout de creación Pages, conservar el bloqueo y reconciliar; nunca volver a crear deployment a ciegas.
7. Confirmar deployment success y estado published.generation=1 antes de dar por completado. Comprobar HTML inicial/recibo y producción intacta. Cerrar READY, Actions, promotor y acceso editorial temporal al terminar.

## Riesgos y controles

GitHub y SQLite no comparten transacción. El journal persiste cada etapa, mantiene createdAt para commits deterministas, actualiza refs sin force y confirma por lectura inmutable antes de aceptar head. Si el ACK del ref se pierde, el reintento detecta la misma referencia sin crear otro commit. Un parent inesperado produce conflicto, nunca overwrite.

offer duplicada ya aceptada no vuelve a almacenar; contenido distinto con la misma intención se rechaza. Los fences rechazan generación/batch obsoletos. claim rechaza otro codeSha. Promoción y resultados inciertos bloquean nuevas ediciones hasta reconciliación.

Una confirmación de repository_dispatch perdida puede ocasionar otra ejecución de Actions si se repite notify: no equivale a garantía de entrega exactamente una vez. El job determinista, la concurrencia y la autorización durable/OIDC del promotor previenen otra publicación. Para esta prueba, no repetir notify automáticamente.

El journal no contiene el cuerpo original: perder el paquete o SNAPSHOT_KEY impediría recuperar esta misma identidad. Ambos siguen disponibles y autenticados. No hacer fallback a otro snapshot.

## Pruebas locales

12 comprobaciones con Node 22.16.0, paquete original protegido y API GitHub ficticia: HMAC/hash; misma intención sin begin; bloqueo previo del builder; otro batch rechazado; corrupción rechazada sin mutar journal; snapshot diferente rechazado por la intención; ACK del ref perdido; reinicio/reintento con mismo commit; offer duplicada sin escritura; codeSha antiguo rechazado; notify determinista sin dispatch real; generación conservada en 1. Cero llamadas remotas o escrituras remotas en estas pruebas.

Evidencias y harness local protegido: generation1-observed.json, generation1-recovery-test.mjs y generation1-local-recovery-result.json en /Users/eugenio/.codex/private/salero-editorial-staging/. No incluyen valores de claves en las salidas ni en Git.

## Estado de seguridad

Actions deshabilitado; promotor OFF; EDITOR_KEY ausente. Ningún recurso remoto desplegado o reconfigurado durante esta preparación. Main y deployment de producción conservan 837db72f99312bcf68c0739a6d4cf6ec718ab521, success, Build command vacío. Home, La Rebotica y Nuestros menús HTTP 200. No cambios WordPress/DNS ni merge.
