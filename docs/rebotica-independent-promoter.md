# Promotor editorial independiente — preparación local

Estado: implementado y probado localmente; no desplegado ni activado. Producción permanece fuera del circuito. Rama `codex/rebotica-editorial-staging`.

## Flujo y frontera de confianza

1. El coordinador existente `salero-push-staging` mantiene la generación, revisión y snapshot privado de GitHub. Solo el productor editorial autorizado puede abrir una generación y ofrecer un snapshot completo firmado.
2. El repositorio privado de snapshots llama a dos workflows reutilizables del repositorio de código **fijados a un commit completo revisado**. Ninguno hereda secretos. El builder obtiene el snapshot autorizado mediante el broker, ejecuta los tests y los renderers actuales; compila las Functions y produce el sitio completo, con modificación editorial limitada a La Rebotica.
3. El Worker nuevo `salero-editorial-promoter-staging` y su DO SQLite independiente verifican JWT OIDC RS256 emitidos por GitHub. Comprobarán repositorio numérico `1410856815`, visibilidad privada, rama `snapshots`, evento permitido, runner GitHub, audiencia por rol y `job_workflow_ref`/`job_workflow_sha` del commit autorizado. El checkout del workflow revisado exige que el código solicitado coincida con ese commit firmado. Un caller modificado no puede seleccionar código arbitrario dentro del job autorizado.
4. El builder registra un manifiesto de todos los archivos (ruta, bytes, SHA-256, hash Pages y MIME). Envía piezas de 1 MiB. El DO comprueba tamaño y SHA-256 de cada archivo ensamblado; los activos quedan en el almacenamiento de subida de Pages, todavía sin deployment. No se utiliza R2. El JWT temporal de subida y el token Pages permanecen en Cloudflare.
5. El promotor contrasta revisión, generación, snapshot y recibo con el coordinador; este sella el digest del artefacto y bloquea nuevas promociones/ediciones durante una publicación pendiente. El promotor construye el manifest y la llamada Pages por sí mismo.
6. El monitor autorizado consulta Pages y el recibo en la URL inmutable del deployment. Solo una confirmación terminal real permite marcar la generación como publicada. No acepta declaraciones de éxito de Actions.

Cuenta, proyecto y rama están fijados en código: cuenta actual, **`salerodigital-staging`**, preview `codex/rebotica-editorial-staging`. El endpoint rechaza campos adicionales como Account ID, proyecto, URL, manifiesto final Pages o destino. El proyecto debe conservar una production branch diferente de la preview. No recibe comandos de despliegue generales.

Un SHA-256 proporcionado por un workflow mutable no demuestra origen legítimo. La autorización depende del OIDC del workflow reutilizable inmutable y del snapshot autorizado. El promotor no reconstruye todo el SSG: confía expresamente en el builder revisado, su runner y sus dependencias fijadas.

## Recuperación y concurrencia

- Replay de JWT+nonce registrado en SQLite; subida idempotente por archivo y generación. Las credenciales HMAC duraderas nunca se entregan al builder; solo recibe una clave transitoria exclusiva para verificar su paquete de trabajo.
- Una edición nueva invalida un build anterior antes de promover. El manifiesto no puede cambiar después de sellarse.
- Antes del único POST de deployment se guarda `creation_started` duraderamente. Si se pierde la respuesta o reinicia el DO, no se repite el POST. Se reconcilia el deployment por identidad editorial y recibo.
- Un resultado desconocido **no tiene timeout que desbloquee**. Si nunca se envió la petición o el deployment no aparece, requiere reconciliación operativa comprobada. Se sacrifica disponibilidad para preservar seguridad; nunca se usa un snapshot antiguo como fallback.
- El listado de reconciliación usa la primera página de deployments; un deployment desplazado fuera de ella necesita ampliación de búsqueda o intervención verificada. No se considera fallo terminal por ausencia.
- El transporte mantiene límites de 3.000 archivos, 80 MiB totales, 16 MiB por archivo y 1 MiB por archivo especial. Cada registro de trabajo está limitado a 1.500.000 bytes; un artefacto que supere ese límite falla sin publicar. Las piezas incompletas y registros requieren una política de retención posterior; no se borran trabajos inciertos.

## Cambios y reutilización

Se reutilizan snapshot privado/GitHub App, coordinador editorial y generaciones, renderers de La Rebotica, SSG de páginas individuales, Functions compiladas y tests existentes. Se añaden broker OIDC, adaptador Pages, DO de promoción, builder/monitor revisados, template dispatcher y tests. No cambian renderers, WordPress, Nuestros menús, sectores ni casos.

El workflow local anterior queda cerrado explícitamente. El remoto actual no se sustituye en esta fase: Actions sigue deshabilitado. No hay nuevas dependencias de pago; se usa el Wrangler/Miniflare/blake3 existente.

## Riesgo residual y permisos

Cloudflare Pages Edit es un permiso de cuenta; no se acredita un token limitado a un proyecto. El JWT de subida por proyecto autoriza subir activos, **no sustituye la credencial necesaria para crear deployments**. No se debe afirmar que la política del token se ha estrechado.

Una modificación del caller de Actions puede causar denegación de servicio o invocar de nuevo el builder revisado, pero no puede recibir el token ni elegir el destino/código/contenido arbitrariamente. Una toma de control del promotor, del código revisado/runner/dependencias o de la administración de Cloudflare sigue siendo un riesgo. En particular, comprometer el promotor podría permitir utilizar el token de cuenta contra producción. El aislamiento es de aplicación y custodia, no un permiso Cloudflare por proyecto.

Antes de activar: retirar de Actions **y rotar** las antiguas `SALERO_BUILDER_KEY`, `SALERO_PROMOTER_KEY`, `SALERO_MONITOR_KEY`, `SALERO_SNAPSHOT_KEY`; revocar sus valores en el coordinador. Cambiar el workflow sin rotar estas claves no elimina sus capacidades históricas. La GitHub App seguirá limitada al repositorio privado editorial. `EDITOR_KEY` continúa retenida hasta nueva autorización.

## Recursos/activación pendiente de autorización

1. Revisar el commit local; publicarlo en la rama sin merge a main para hacer disponibles los workflows reutilizables. Mantener Actions apagado.
2. Verificar plan/consumo Free real y políticas de tokens en Cloudflare. Crear únicamente el nuevo Worker y su DO SQLite; mantener `PROMOTER_ENABLED=false`, sin rutas ni cron inicialmente. Service binding privado al coordinador staging.
3. Cargar exclusivamente en ese Worker `PAGES_DEPLOY_TOKEN`, claves internas rotadas `BUILDER_KEY`, `PROMOTER_KEY`, `MONITOR_KEY`, `SNAPSHOT_KEY`; actualizar esas claves en el coordinador staging. No entregar Pages Write/Read ni claves HMAC a Actions. No usar credenciales MCP/producción.
4. Configurar `CODE_SHA` y `TRUSTED_WORKFLOW_SHA` al mismo commit revisado, `REPOSITORY_ID=1410856815`. Instalar el template dispatcher con ese SHA literal en el repositorio privado. Verificar `SALERO_STAGING_READY=false`, permisos mínimos y presupuesto de Actions $0/Stop usage.
5. Con autorización específica, exponer únicamente el Worker staging, habilitarlo, completar EDITOR_KEY en el coordinador staging y habilitar Actions. Un productor sintético local ofrecerá un snapshot firmado; no WordPress de producción ni Deploy Hook.
6. Ejecutar una prueba real de generación actual, duplicados, generación obsoleta y fallos recuperables; registrar consumo CPU/SQLite, requests, minutos Actions y receipt/ID de Preview. Hasta entonces no está validado el circuito remoto.

No se han creado estos recursos ni ejecutado estos pasos. No hay URL nueva de Preview.

## Coste y rollback

Sin nueva suscripción prevista dentro de Workers Free, DO SQLite Free, Pages y minutos Actions disponibles. Los límites son efectivos: no habilitar planes pagados. El trabajo de subida/hash se ejecuta en el DO para evitar el presupuesto CPU de 10 ms del Worker Free. Las pruebas locales no acreditan consumo en Cloudflare; una prueba aislada debe medirlo antes de declarar viabilidad operativa definitiva.

Rollback: deshabilitar Actions y READY, deshabilitar el nuevo promotor y retener EDITOR_KEY; conservar el último deployment válido de staging y los snapshots/estados para reconciliar. No desbloquear ni borrar trabajos de publicación inciertos. No modificar producción, main, DNS, Pages de producción ni WordPress. Revertir el código en la rama solo después de reconciliar un deployment en vuelo.

## Verificación local

Node 22.16.0: suite editorial/SSG existente PASS; 36 comprobaciones nuevas de autenticación/políticas/artefactos/recuperación; 9 escenarios adicionales en workerd y SQLite reales locales, con archivo de 15.219.071 bytes transmitido en 15 piezas. El coordinador existente mantiene sus 32 escenarios workerd PASS. Functions compiladas localmente: 157.215 bytes. GitHub OIDC/JWKS y API Pages se simulan en estas pruebas; no se han validado emisiones OIDC ni deployments reales. Actions remoto sigue deshabilitado. No se han cargado secretos.

Un reinicio del mismo trabajo se reconcilia desde SQLite. Un rerun de Actions con distinta identidad/attempt no puede apropiarse de un artefacto anterior; exige recuperación explícita y un trabajo nuevo tras confirmar el fallo previo. Asimismo, una confirmación perdida del bloqueo de promoción puede requerir intervención aunque todavía no haya POST Pages. Los reintentos automáticos de transporte no relajan esos bloqueos.
