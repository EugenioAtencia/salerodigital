# Integración aislada GitHub de snapshots editoriales

Rama local `codex/github-snapshot-integration`. Conserva Phase 1
`c31aae8eecf6c1cad46057d4721992d98457772f` y Phase 2
`344aa360ac43c42f2bd37b37ff68d024c457840e` sobre base de producción
`8283cebe5db420ecb0e4671cc99b21badee2288b`. Sin push, merge, recursos remotos,
Hook ni modificación de WordPress o Cloudflare producción. No hay credenciales
reales en archivos. No es validación de automatización real.

## Arquitectura y consistencia

WordPress aislado → RPC firmada Worker → DO SQLite → GitHub App → repositorio
editorial privado. Pages recibe el paquete autorizado mediante builder RPC; no
necesita credenciales GitHub ni consultar SiteGround. GitHub sustituye a R2.

SQLite es autoridad de generación, permiso editorial, intención de almacenamiento,
manifesto autorizado, trabajo y publicación. La referencia Git no decide qué
snapshot se publica. La secuencia explícita es:

1. `begin(batch)` confirma en SQLite una generación antes de una mutación visible.
   Debe mantenerse un lock local WordPress y registrar operaciones incompletas.
2. Exportador: revisión inicial, lectura completa paginada, revisión intermedia,
   segunda lectura completa idéntica, revisión final; todas `editing=false`.
   Incluye ACF, términos/medios embebidos y referencias numéricas de medios de
   casos mediante REST interno anónimo dentro de ambas lecturas.
3. Snapshot firmado HMAC, SHA-256 de bytes exactos, counts y duplicados validados.
4. DO registra intención durable por batch; checkpoints de parent, blobs, tree,
   commit y referencia. GitHub publica ambos archivos en un commit y avanza la
   referencia sin force. Fechas y contenido deterministas permiten reconciliar
   respuestas perdidas sin generar commits adicionales.
5. Comprueba privacidad/repositorio exactos, commit/tree, miembros del tree,
   truncamiento, tamaño, manifest hash, HMAC y snapshot hash. Una **transacción
   SQLite separada** vuelve a cercar la generación y confirma el manifiesto.
   No existe ni se presupone transacción distribuida GitHub/DO.
6. Builder fija trabajo + code SHA + generación + snapshot. Lee por commit/blob
   inmutables y vuelve a validar antes/después del SSG y al emitir artefactos.
7. `preparePromotion` bloquea nuevas mutaciones visibles durante una publicación.
   Trabajo incierto no caduca ni se desbloquea automáticamente. Solo monitor
   independiente puede confirmar resultado terminal y recibo exacto. Esta fase
   no implementa ni ejecuta un monitor real ni la promoción Pages.

Una escritura Git parcial, fallo/rate-limit, timeout o confirmación perdida deja
la ventana editorial abierta y bloquea el build. No se lee otro snapshot como
fallback. Se reintenta el mismo batch/paquete con nuevo nonce. Conflicto de
referencia o intención diferente exige reconciliación; nunca force ni sustitución
silenciosa. El cliente Node tiene 3 intentos con backoff; no reintenta errores de
integridad, autenticación o generación. WordPress aún requiere outbox/lock/retry
**durables reales**; la biblioteca no añade hooks ni tareas al CMS.

## Edición durante incidencias

Borradores, revisiones y administración ajena al contenido público siguen
permitidos según la política local. Un cambio visible necesita permiso confirmado
antes de escribir. Si no se pudo anunciar la edición, debe bloquearse esa operación
visible; permitirla sin anunciar rompería la garantía frente a builds en curso.
Con permiso ya confirmado y ventana local abierta, el contenido puede guardarse
ante un fallo posterior de GitHub/Cloudflare, manteniendo bloqueada la publicación
web. Exportación congelada o publicación/resultado incierto bloquean nuevas
mutaciones visibles. No implica bloqueo global de wp-admin.

Las barreras de administración, REST, ACF/meta, taxonomías, medios referenciados y
WP-CLI siguen **pendientes de conectar y verificar en WordPress aislado real**.
No hay un WordPress aislado identificado; no se han hecho pruebas de escritura.
El exporter y transporte son bibliotecas sin activación automática.

## SSG y páginas individuales

Renderers actuales sin modificación. Home + cuatro matrices y once páginas
individuales sintéticas 4/3/2/2 se generan en HTML inicial. Servicios usan las
cuatro plantillas vigentes; sectores usan las tres plantillas vigentes y el
renderizador sectorial; casos usan el renderer v4 y medios del snapshot; artículos
usan la plantilla actual del cliente, ejecutada localmente, sin el fetch del
cliente. Se mantienen clases, CSS, estructura, H1/title/canonical y un schema graph.
No se ha certificado equivalencia visual contra contenido real ni navegador remoto.
Plantillas nuevas no soportadas o medios numéricos ausentes provocan fallo explícito.

Las ocho Functions de servicios/sectores/casos/artículos (rutas con/sin index)
sirven solo HTML enumerado y hasheado en el recibo de su propio deployment.
Página no enumerada: 404; página corrupta: 503. No consultan CMS en modo snapshot.
El modo legado conserva los handlers actuales para rollback. Imágenes/vídeos
siguen siendo URLs públicas existentes; eliminar REST no copia los binarios.

Nuestros menús queda sin modificación, con prueba byte por byte. Tampoco cambian
los renderers, CSS, contenidos generados del checkout o comando de producción.

`build-snapshot-isolated.mjs` ejecuta tests críticos, claim/check autenticados,
render y fences. Solo acepta salida fuera del checkout, escribe en temporal y
renombra atómicamente. El recibo incluye hashes de HTML, revisión, generación,
identidad, counts, tests y `publicationAuthorized=false`. **Preparar artefactos
no autoriza ni ejecuta un deploy**. Una integración Pages futura deberá mantener
la barrera final y reconciliación terminal antes de usar ese output; conectar este
script solo como Build command no completa esa garantía.

## Autenticación y recursos mínimos para staging

Antes de crear cualquier recurso, nueva autorización y verificación de propietario,
permisos, plan gratuito/cuotas disponibles e inexistencia de conexión a producción:

- Repositorio privado independiente `salero-editorial-snapshots-staging`, rama
  `snapshots` inicializada. Plantilla `integrations/github/editorial-repository/`.
  Sin Actions, LFS, Pages o builds disparados por commits editoriales. Código y
  contenido tienen historiales independientes; no se mezclan commits.
- GitHub App privada: instalar **solo** en ese repositorio; Contents write,
  Metadata read implícito; sin permisos de cuenta/organización, sin eventos ni
  webhooks. Diseño en `integrations/github/github-app-design.json`; no es una
  creación de App ni contiene clave. Token de instalación limitado expresamente
  al repo y Contents write. JWT RS256, expiración corta, token cacheado hasta un
  minuto antes de caducar, respuestas acotadas y sin logging de secretos.
- Worker `salero-push-staging` y clase DO SQLite `EditorialCoordinator`, instancia
  `salero-staging-editorial`, migración `v1`. No binding/bucket R2. Configuración
  actual `workers_dev=false`, owner `UNCONFIGURED`, CODE_SHA de base: no desplegar
  así. Fijar el SHA de integración aprobado antes de una prueba real.
- Secrets Worker separados: `EDITOR_KEY`, `BUILDER_KEY`, `MONITOR_KEY`,
  `SNAPSHOT_KEY`, `GITHUB_APP_PRIVATE_KEY`; App ID/Installation ID como config.
  WordPress aislado recibe solo editor/snapshot; builder solo builder/snapshot;
  monitor solo monitor. Pages no recibe clave App/token GitHub. Sin PAT personales.
- Acceso de preparación: administración del repo para crear/instalar App; token
  Cloudflare limitado a cuenta de prueba y edición Worker/DO, no DNS ni producción.
  El monitor futuro necesita lectura Pages limitada, separada de esos roles.
- WordPress aislado adecuado con WP-CLI/PHP compatible, contenido de prueba,
  mu-plugins separado, flags producción siempre OFF. Revisar permisos/routes y
  bloquear mutaciones visibles por todas las vías antes de probar.

## Pruebas locales

Node 22.16.0; PHP 7.4.33. Ejecutar desde raíz:

```sh
SALERO_TEST_PHP=/ruta/local/php node scripts/test-push-github.mjs
```

| Suite | Resultado |
|---|---:|
| Exportador PHP | 41 PASS |
| Coordinador/protocolo Phase 1 | 62 PASS |
| Transporte/política PHP | 39 PASS |
| Adaptador GitHub/App/retry | 22 PASS |
| SSG individual/artefactos/Functions | 41 PASS |
| Worker/SQLite/GitHub simulado + SSG | 29 PASS |
| Sectorial | PASS |
| Colecciones/middleware/schema | 78 PASS |
| Fetch JSON, casos, menús | PASS |
| Build editorial anterior | 14 escenarios PASS |
| MU-plugin anterior ON/OFF/ausente/autosave/URL | PASS |
| Tipos y bundle Wrangler | PASS, generación local/dry-run |

GitHub API es un fixture HTTP local; JWT se verifica con RSA efímero. workerd y
SQLite son reales locales, con reinicio del runtime. Se cubren: concurrencia,
replay/roles, snapshot parcial/corrupto/antiguo, revisión cambiante, GitHub
401/403/rate limit/500/503, 202 HTML rechazado, lost ACK en blobs/tree/commit/ref,
ref externa/conflicto, tree truncado, identidad/integridad, reinicio SQLite,
promoción obsoleta/incierta, timeout TCP local, retry e inexistencia de fallback.
Las Functions reales se invocan con ASSETS local en los ocho entry points.
No son pruebas contra GitHub/WordPress/Cloudflare remoto ni despliegues reales.

## Costes, límites y retención

Complejidad: 30 archivos en esta integración (15 modificados, 15 nuevos), además de los commits previos conservados.
No se añaden dependencias npm/PHP ni suscripciones; se reutiliza Node crypto,
Fetch/Git Database API, Wrangler/Miniflare fijados y SQLite. Repositorios privados
son compatibles con GitHub Free. No se usan Actions, LFS ni protección de ramas
que requiera upgrade. El adaptador limita cada blob a 1 MiB; no almacena binarios.
Por ciclo sintético se esperan decenas de llamadas API, por debajo de la cuota
mínima de instalación App de 5.000 solicitudes/hora; además aplican límites
secundarios. No se garantiza disponibilidad ni cuota exclusiva de la cuenta.

Workers/DO SQLite tienen plan Free, con límites diarios; Pages Free permite
500 builds/mes. Mantener exclusivamente Free, sin aceptar planes/overages. CPU,
almacenamiento y consumo disponibles de la cuenta deben medirse antes/después de
la prueba real. Los tiempos Node/workerd no prueban cumplimiento CPU remoto.
Fuentes oficiales consultadas:
[GitHub Free](https://docs.github.com/en/get-started/learning-about-github/githubs-plans),
[rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api),
[DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/),
[Pages limits](https://developers.cloudflare.com/pages/platform/limits/).

Retención append-only inicialmente. Git conserva historial aunque se borren paths.
No programar GC ni expiración que afecte trabajos/rollback. Monitorizar crecimiento;
una limpieza futura requerirá migración/backup/reconciliación aprobados.

## Una única prueba real aislada pendiente

1. Aprobar recursos y comprobar planes/permisos/cuotas. Crear repo/App/Worker/DO
   separados, sin producción; generar secrets fuera de Git, fijar CODE_SHA correcto.
2. Disponer WordPress aislado; conectar outbox/lock/retries y las barreras reales,
   validarlas antes de cualquier mutación visible. Sin eso, detener escritura.
3. Confirmar GitHub privado + instalación limitada; bootstrap repo y comprobar
   autenticación/redirecciones/API version/cuota reales. Mantener modo manual.
4. Abrir un batch de prueba, editar solo contenido aislado, exportar 4/3/2/2,
   ofrecer una vez y reconciliar si se pierde confirmación. Verificar los SHAs en
   GitHub y la autorización SQLite, sin Hook de producción.
5. Un trabajo y un build manual aislado, monitor terminal confiable, staging con
   rama/SHA aprobados; no habilitar promoción automática hasta verificar el
   bloqueo de publicaciones antiguas en el ciclo real. Comprobar HTML, JS/SEO,
   Functions, recibo y counts en URL staging. Medir CPU y operaciones reales.
6. Solo después de evidencia completa considerar automatización validada. No
   programar un segundo deployment por retry ni activar producción en esta prueba.

## Rollback

Esta rama local puede abandonarse sin cambiar producción. Cada artefacto es
externo al checkout. Futuro staging: detener nuevos trabajos, bloquear/publicación
incierta hasta reconciliar estado terminal, conservar último deployment válido y
snapshot/commit autorizado. Volver al build/Functions legado únicamente mediante
rollback explícito y revisión de flags. No restaurar una generación antigua por
fallback ni reescribir el head SQLite para desbloquear. Retirar recursos/keys de
staging solo después de guardar los registros necesarios; revocar App/token al
terminar si se descarta. Nunca tocar producción ni el MU-plugin instalado.

## Archivos exactos de esta integración

`A` creado; `M` modificado. No incluye los archivos conservados sin cambios de
las fases anteriores.

```text
A	docs/editorial-push-github-integration.md
A	functions/_shared/snapshot-page.js
M	functions/casos-de-exito/[slug].js
M	functions/casos-de-exito/[slug]/index.js
M	functions/el-menu/[slug].js
M	functions/el-menu/[slug]/index.js
M	functions/la-rebotica/[slug].js
M	functions/la-rebotica/[slug]/index.js
M	functions/sectores/[slug].js
M	functions/sectores/[slug]/index.js
A	integrations/cloudflare/push-staging/github-app.mjs
M	integrations/cloudflare/push-staging/test.mjs
M	integrations/cloudflare/push-staging/worker.mjs
M	integrations/cloudflare/push-staging/wrangler.jsonc
A	integrations/github/editorial-repository/README.md
A	integrations/github/editorial-repository/repository-settings.json
A	integrations/github/github-app-design.json
M	integrations/wordpress/salero-editorial-snapshot.php
A	scripts/build-snapshot-isolated.mjs
A	scripts/lib/editorial-github-store.mjs
A	scripts/lib/editorial-push-retry.mjs
A	scripts/lib/editorial-snapshot-artifacts.mjs
A	scripts/lib/editorial-snapshot-pages.mjs
M	scripts/lib/editorial-snapshot-ssg.mjs
A	scripts/test-push-github.mjs
M	tests/casos-cms-source-of-truth-simulation.mjs
A	tests/editorial-github-store-simulation.mjs
M	tests/editorial-push-exporter-simulation.php
A	tests/editorial-snapshot-pages-simulation.mjs
A	tests/fixtures/editorial-github-api.mjs
```
