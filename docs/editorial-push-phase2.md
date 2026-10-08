# Fase 2: integración local preparada; integración remota pendiente

Comprobaciones del 8 de octubre de 2026. Rama `codex/push-snapshots-phase1`.
Base y `origin/main`: `8283cebe5db420ecb0e4671cc99b21badee2288b`.
Fase 1 guardada en `c31aae8eecf6c1cad46057d4721992d98457772f`.

## Límite alcanzado

No se ha identificado un WordPress aislado adecuado: el conector enumera cuatro
sitios públicos de clientes, ninguno identificado como staging. No hay WP-CLI,
Docker, Local.app ni una instalación WordPress local encontrada en los directorios
de trabajo consultados. No se han usado esos sitios como laboratorios ni se han
ejecutado escrituras WordPress. Se aplica la condición del usuario: preparar la
integración local y detenerse antes de pruebas de escritura.

No se han creado recursos remotos. La cuenta ofrece Workers y DO SQLite, pero
R2 aún no está habilitado: el panel redirige a `/r2/plans` y pide añadir una
suscripción, aceptar términos y utilizar el método de pago registrado para
posibles excedentes. No se ha pulsado ese botón. El token disponible permite
listar Workers, pero devuelve 403/10000 para R2, suscripciones y subdominio.
No se han ampliado permisos ni aceptado compromisos de facturación.

## Componentes preparados

1. Worker de staging sin rutas de producción ni URL pública habilitada.
   HTTP POST `/rpc`, JSON estricto, cuerpo limitado incluso sin Content-Length,
   errores sanitizados y `Cache-Control: no-store`.
2. Cuatro claves diferentes: editor, builder, monitor y firma de snapshots.
   HMAC, nonce y ventana de 60 segundos. Las claves solo existen en memoria
   durante tests; `.dev.vars*` queda ignorado. No hay secretos en Wrangler.
3. DO SQLite con transacciones síncronas. Cada petición recupera el estado
   persistido; generaciones, permisos, nonces, manifiesto, trabajo y bloqueos
   sobreviven a reinicios. Los errores de una operación autenticada conservan
   el nonce consumido. No hay desbloqueo por caducidad de un trabajo incierto.
4. R2 privado: objeto direccionado por hash, escritura create-only, lectura y
   comprobación del tamaño/hash antes de confirmar el manifiesto en SQLite.
   Después del await se vuelve a comprobar la generación. El manifiesto
   autoritativo es el estado SQLite, no un `latest.json` sobrescribible en R2.
5. Cliente PHP portable, exclusivamente para staging/local: `wp_remote_post`,
   timeout 5 s, sin redirects, TLS verificado, JSON/200 obligatorios, firmas
   compatibles con Node. No tiene hooks ni llamadas automáticas.
6. Política PHP previa a escritura: borradores y operaciones ajenas pueden
   continuar; cambios visibles requieren permiso confirmado y ventana local
   abierta. Un estado desconocido o congelado se rechaza. Es una biblioteca
   de preparación; **no es todavía una barrera conectada a WordPress**.
7. Adaptador SSG explícito: verifica el paquete, fija su identidad al trabajo,
   llama a los renderers existentes y vuelve a comprobar la revisión/generación
   antes de devolver los documentos. No consulta SiteGround, no escribe en el
   checkout y no sustituye el comando de build de producción.

Se reutilizan el exportador de doble lectura, validador de registros, HMAC,
máquina de estados y renderers de Fase 1. `validateOffer` y `commitOffer` separan
validación y confirmación para permitir I/O asíncrono sin perder la barrera.

## Ejecución local reproducible

Node 22.16.0 y PHP 7.4.33 utilizados en las comprobaciones.

```sh
# Desde el repositorio; PHP debe apuntar al binario de pruebas local.
node scripts/test-push-phase1.mjs --php=/ruta/local/php
php -d pcre.jit=0 tests/editorial-push-staging-transport.php
node scripts/test-editorial.mjs

cd integrations/cloudflare/push-staging
npm ci
SALERO_TEST_PHP=/ruta/local/php npm test
npx wrangler types
WRANGLER_SEND_METRICS=false npx wrangler deploy --dry-run
```

El test compila sin desplegar, inicia workerd con DO SQLite y R2 **locales**, usa
un directorio temporal persistente entre reinicios y lo retira al terminar.
No llama a Deploy Hooks. `npm ci` solo instala dependencias; no hay postinstall.

Herramientas fijadas en lockfile: Wrangler 4.148.0, Miniflare
5.20261006.0-alpha y tipos Node 22.20.5. La versión actual de Wrangler utiliza
esa versión alpha de Miniflare; es un riesgo de herramientas, no una dependencia
del Worker remoto. Se usa el conversor V4 documentado por sus tipos y el bundle
en memoria: cargarlo por `scriptPath` produjo un fallo de inicio del runtime.
Override `sharp=0.35.5`: elimina el advisory de librsvg de la dependencia de
desarrollo. `npm audit`: cero vulnerabilidades conocidas en el árbol resultante.
Estas dependencias están aisladas del package.json y build de producción.

## Resultados

| Grupo | Resultado | Alcance |
|---|---:|---|
| Exportador PHP Fase 1 | 38 PASS | Fixtures, doble lectura, counts, revisión, integridad |
| Coordinador Fase 1 | 62 PASS | Simulaciones de protocolo y fallos |
| Transporte/política PHP nuevos | 39 PASS | Sin WordPress real, sin HTTP ni escrituras CMS |
| Worker/SQLite/R2/SSG locales nuevos | 29 PASS | Runtime workerd, almacenamiento local y HTTP local |
| Sectorial | PASS | Suite existente |
| Colecciones/middleware/schema | 78 PASS | Suite existente |
| Fetch JSON | PASS | Suite existente |
| Casos | PASS | Suite existente |
| Nuestros menús | PASS | Suite existente, sin cambios |
| Editorial build | 14 PASS | Suite existente, fail-closed |
| MU-plugin existente ON | 26 PASS | Simulación aislada |
| MU-plugin existente OFF/constante ausente | 36 + 36 PASS | Simulación aislada |
| Autosave ON/OFF | PASS | Simulación aislada |
| Validación URL Hook | 17 PASS | Simulación, ningún POST real |
| Tipos y bundle Wrangler | PASS | Types + dry-run, sin upload |
| WordPress/ACF/REST/WP-CLI reales | NO EJECUTADO | Falta entorno aislado |
| Cloudflare remoto | NO EJECUTADO | R2 sin habilitar; sin recursos creados |

Los 29 escenarios nuevos prueban: autenticación/roles/expiración/replay, estado
desconocido, permiso durable, reinicio y replay persistente, interoperabilidad
PHP/Worker, snapshot corrupto, subida completa, retry tras confirmación perdida,
lectura verificada para builder, SEO conservado, revisión cambiante durante SSG,
generación incorrecta, edición concurrente, snapshot antiguo, fallo terminal,
corrupción R2, reparación controlada del objeto local de prueba, bloqueo de
promoción tras reinicio, resultado incierto sin expiración, recuperación,
restricciones HTTP/JSON, rechazo de 202 HTML, timeout real de un proxy HTTP local
y conexión TCP rechazada. El proxy local demora la respuesta, nunca SiteGround.

No se han medido CPU ni operaciones en Cloudflare para este código. El tamaño
del snapshot sintético 4/3/2/2 es 3.923 bytes; no representa el contenido real.
Las confirmaciones de deployment de los tests son fixtures firmados por el rol
monitor, **no verificaciones contra la API Pages**. La reconciliación con un
deployment remoto y la promoción real siguen pendientes.

## WordPress: cobertura necesaria antes de conectar barreras

| Operación | Barrera candidata anterior a SQL | Validación real pendiente |
|---|---|---|
| Admin/REST/WP-CLI insert/update/status | `wp_insert_post_data`, REST pre-insert | Publicar nuevo, actualizar visible, despublicar, programación |
| Borrar/papelera/restaurar | `pre_delete_post`, `pre_trash_post`, filtro pre-untrash | Comprobar orden antes de borrar meta/relaciones |
| ACF/metadatos | filtros add/update/delete post metadata | Guardado completo de ACF y registros de escritores activos |
| Relaciones taxonómicas | acciones add/delete term relationships | Antes de la mutación, incluyendo API/WP-CLI |
| Términos y term-meta compartidos | pre-insert/edit/delete + filtros metadata | Resolver todos los contenidos públicos afectados |
| Medios referenciados | post/meta de attachment + pre-delete attachment | Imágenes, alt, tamaños, ACF, `_embedded`, archivos reemplazados |
| REST batch/importadores/CLI | Barreras core y cierre de escritores | Evitar rutas que escriben SQL directamente |

La lista es un plan de implementación, no hooks instalados ni pruebas pasadas.
Antes de conectarla hacen falta un journal/registro durable de escritores en
WordPress, congelación atómica de la exportación, revisión derivada del journal,
resolver de referencias públicas y tratamiento de peticiones parcialmente
fallidas. No basta `save_post` posterior a SQL. Un proceso interrumpido debe
mantener el bloqueo hasta reconciliarse; no debe fingir un guardado completo.
La biblioteca actual de exportación sigue utilizando la revisión del plugin
existente; el entorno aislado deberá suministrar la revisión del nuevo journal.

Durante una incidencia:

- Se permiten borradores/revisiones y administración ajena al contenido público.
- Sin ACK durable de `begin`, se bloquean únicamente las mutaciones visibles
  cubiertas por el protocolo. No se bloquea globalmente wp-admin.
- Con ventana confirmada, los cambios visibles pueden continuar temporalmente
  sin conexión: el coordinador ya bloqueó la publicación. Se mantienen pendientes
  durables y se reenvía la misma identidad con nonces nuevos.
- Durante congelación/exportación o promoción incierta, se bloquean nuevas
  mutaciones visibles. Los borradores continúan disponibles.
- No hay fallback silencioso ni publicación desde un snapshot anterior.

## Páginas individuales: dependencia pendiente

El nuevo adaptador solo devuelve Home y matrices. Auditoría de rutas actuales:

- Servicios: `functions/el-menu/[slug].js` utiliza el renderer de servicios,
  basado en contenido definido en código; no es una lectura uniforme del snapshot.
- Sectores: `[slug].js` tiene ruta asset-first y fallback REST; `[slug]/index.js`
  genera shell cliente. Ambas rutas deberán usar la revisión del deployment.
- Casos: las dos rutas utilizan `caso-renderer-v4.js`, que consulta REST y medios.
- Artículos: las dos rutas utilizan `blog-renderer-client.js`; el JavaScript
  del artículo consulta posts en SiteGround y el shell contiene loading.

No se han alterado esas Functions ni su diseño. Pendiente eliminar su dependencia
editorial de SiteGround mediante assets/datos fijados al snapshot verificado del
deployment; la comprobación no podrá consultar el manifiesto más reciente en
tiempo de visita. Medios remotos necesitarán una política explícita de integridad
y versionado antes de afirmar consistencia de todo el contenido visible.

## Cuotas, consumo y costes

Observación del panel de la cuenta antes de cualquier creación:

- Workers: 1.287 / 100.000 solicitudes hoy, 98.713 restantes en ese instante.
  Periodo 1–8 octubre: 11,17k solicitudes, 48,86k ms CPU.
- DO: 24,12 MB SQLite existentes; hoy 0 solicitudes/duración/filas SQL
  leídas/escritas según panel. Estos valores pertenecen a recursos anteriores.
- R2: no habilitado, sin consumo disponible que consultar.

Límites oficiales: Workers Free 100k solicitudes/día y 10 ms CPU/invocación;
DO SQLite Free 100k solicitudes/día, 13k GB-s/día, 5M filas leídas/día,
100k escritas/día y 5 GB. R2 Standard incluye 10 GB-mes, 1M operaciones A,
10M B y egress gratuito, pero factura excedentes. No existe garantía general
de coste cero por habilitar R2: hacen falta límites propios y vigilancia del
consumo compartido. El usuario no ha autorizado esa habilitación en este paso.

Estimación, no consumo real: 100 revisiones/mes, snapshots de hasta 1 MiB y
retención de 100 snapshots producirían hasta 100 MiB de R2. Un offer necesita
una operación A y una B; cada lectura verificada del builder otra B. Retries
añaden operaciones. Cada RPC consulta/actualiza una fila de estado SQL; los
permisos/jobs conservados incrementan tamaño y CPU. La prueba remota debe medir
rows/CPU/R2 reales y validar una política de retención que conserve rollback.
Los registros aún no tienen retención automatizada: no habilitar cargas
indefinidas ni accesos públicos antes de añadir límites, protección frente a
abuso y limpieza controlada.

Fuentes consultadas:
https://developers.cloudflare.com/workers/platform/pricing/
https://developers.cloudflare.com/durable-objects/platform/pricing/
https://developers.cloudflare.com/r2/pricing/
https://developer.wordpress.org/reference/hooks/wp_insert_post_data/
https://developer.wordpress.org/reference/hooks/pre_delete_post/
https://developer.wordpress.org/reference/hooks/update_meta_type_metadata/

## Producción y rollback

Consulta de solo lectura a Pages: deployment
`610cc02c-e488-4dcf-a2ca-929be3c4c80b`, success, SHA
`8283cebe5db420ecb0e4671cc99b21badee2288b`, branch main, Build command vacío.
HTTP con curl estándar: 200 en Home, cuatro matrices y Nuestros menús.
La lectura con urllib recibió errores HTTP; no se alteró User-Agent para eludir
protecciones. No se ha escrito en WordPress ni se ha conectado con SSH al CMS:
OFF/0 pendientes son el estado de partida aportado, no una nueva medición CMS.

No hubo push de la rama, merge, Deploy Hook, cambios Pages, cron ni activación
del plugin. El package.json raíz, Functions, HTML y MU-plugin existente permanecen
sin cambios. El ref local `main` ya estaba atrasado en `69662e4`; no se movió.
Se verificó el SHA real de GitHub mediante `git ls-remote`.

Rollback local: conservar/revertir el commit de integración en esta rama, sin
reset destructivo ni tocar main. Las pruebas retiran sus directorios temporales.
No hay recursos remotos ni instalación WordPress que retirar. En una integración
remota posterior, detener primero editores/builders y reconciliar trabajos; nunca
restaurar un checkpoint viejo del coordinador para retroceder generaciones.

## Condiciones para completar Fase 2 y pasar a Fase 3

1. WordPress aislado con versiones/CPT/ACF equivalentes, identificación explícita
   de staging y permiso de pruebas de escritura sobre fixtures.
2. Barreras reales, journal y cierre de escritores en todas las operaciones de
   la tabla; pruebas de fallo antes/después de cada mutación y recuperación.
3. Resolver referencias de medios/taxonomías y revisar exportación anónima.
4. Resolver habilitación de R2 y accesos, sin aceptar automáticamente términos
   ni costes; crear exclusivamente recursos separados, privados y limitados.
5. Ejecutar las pruebas remotas y medir CPU, almacenamiento, filas y operaciones
   con el snapshot real. Los tiempos Node o workerd local no prueban el límite
   Workers Free de 10 ms.
6. Integrar y verificar todas las páginas individuales y medios, fijados al
   snapshot del deployment. Comparar diseño/SEO y cubrir bajas editoriales.
7. Monitor independiente que autentique el resultado Pages y recibo real;
   controlar todos los publicadores, deployments manuales y builds Git antes
   de considerar resuelta la carrera de promoción.
8. Reintentos durables con ejecución fiable, retención, límites de costes,
   alertas sin secretos y ensayo de rollback.

**Fase 2 remota completada: NO. Lista para Fase 3: NO.**
