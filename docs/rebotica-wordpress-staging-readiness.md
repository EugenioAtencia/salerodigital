# WordPress aislado y build de staging — 13 de octubre de 2026

## Resultado de la localización

La documentación existente identifica `staging6.cms.webagencia360.com` como
destino previsto, pero deja pendiente confirmar su ruta, SSH/WP-CLI y DB. No
acredita que se instalara el exportador allí. Los dos guards PHP siguen fijados
a ese hostname. No se encontró otra URL de WordPress staging documentada en
los archivos revisados.

Lecturas DNS de esta sesión:

- `dig staging6.cms.webagencia360.com @1.1.1.1`: NXDOMAIN.
- `dig staging6.cms.webagencia360.com @ns1.siteground.net`: NXDOMAIN,
  respuesta autoritativa (flag aa), zona `webagencia360.com`.
- `cms.webagencia360.com`: NOERROR; el CMS de producción resuelve.

Por tanto el error ENOTFOUND corresponde a la ausencia del nombre en el DNS
autoritativo; no es solo una caché del equipo. No se puede determinar desde
DNS si el clon fue eliminado, nunca creado o conserva otro hostname.

El panel existente de SiteGround se abrió y solicita login. El conector Salero
WordPress MCP devuelve UNAUTHORIZED y exige reautenticación. La configuración
SSH disponible no incluye un alias de este CMS. No se intentaron conexiones
a servidores de otros clientes ni se crearon recursos o registros DNS.

**URL accesible, aislamiento, plugins instalados, flags, cron y eventos del
WordPress staging: todavía no confirmados.** Un evento no observado no puede
declararse ausente. Se solicitó al propietario iniciar sesión en el panel.

## Comprobaciones al recuperar el acceso

Consultar el inventario de instalaciones/clones existentes de este CMS en
SiteGround sin crear, desplegar o eliminar nada. Para el clon encontrado:

1. Comparar rutas físicas de instalación, wp-config y archivos con producción;
   comprobar enlaces simbólicos y confirmar que no comparte archivos editables.
2. Comparar privadamente las identidades de base de datos: DB independiente,
   no solo distinto prefijo de tablas en la DB de producción. Informar solo el
   resultado de independencia, sin credenciales ni valores privados.
3. Leer sus home/siteurl y configuración propia; no sustituir DNS ni URLs.
4. Inventariar plugins y mu-plugins, cotejar los cuatro PHP editoriales y flags
   de habilitación, y comprobar presencia de configuración sin mostrar claves.
   El hook existente exige ese hostname exacto; si el entorno real usa otro,
   preparar un ajuste local del guard al destino confirmado antes de activarlo.
5. Leer cron, intent, outbox, dispatch y eventos incompletos del journal sin
   ejecutar WP-Cron, tick, exportaciones ni notificaciones. Preferir lecturas de
   archivos/DB que no arranquen los hooks de WordPress. No asumir que cargar
   WordPress mediante WP-CLI es una operación sin efectos de plugins.
6. Confirmar mediante lectura que no hay publicación ambigua en el coordinador
   o promotor. Conservar el job terminal de generación 1 y el preview manual;
   no convertir el deployment manual en una publicación asentada en el DO.

## Preparación local del build

El generador llama a `applyStagingPreview` solo con scope `rebotica` y branch
`codex/rebotica-editorial-staging`. Esta función modifica únicamente el
middleware copiado a la salida aislada; no modifica las Functions fuente.

- Desactiva la inyección GTM y elimina tags de Analytics preexistentes del HTML.
- Añade meta robots y cabecera X-Robots-Tag `noindex, nofollow`.
- Usa el origen HTTPS del preview consultado para canonical, enlaces internos
  al sitio y URLs del JSON-LD; sirve tanto URL inmutable como alias de rama.
- Reescribe redirects internos de producción hacia ese mismo origen.
- El artefacto staging rechaza hosts ajenos a `salerodigital-staging.pages.dev`.
- Conserva las páginas HTML certificadas y sus hashes: la transformación de la
  respuesta se realiza después de que snapshotPage verifica los bytes ASSETS.
- Producción y otros scopes conservan el middleware y las páginas originales.

La cabecera se añade en Functions: `_headers` no cubre sus respuestas, según
[Cloudflare](https://developers.cloudflare.com/pages/configuration/headers/).
El empaquetado existente `_worker.bundle` se conserva.

Pruebas: `node scripts/test-rebotica-editorial.mjs` PASS, incluidas las suites
SSG/editoriales/PHP existentes, las ocho comprobaciones de empaquetado y la
nueva prueba de preview en workerd. Esta última comprueba HTML inicial,
canonical/schema para dos hosts de preview, noindex, eliminación de tracking
embebido, huellas intactas, guard de host y ausencia de cambios en middleware
de producción. Cero operaciones editoriales o deployments remotos.

## Operaciones pendientes, con autorización separada

Una vez demostrado el aislamiento, seleccionar un borrador por ID/slug y
registrar el conjunto de artículos públicos que incluirá el snapshot completo.
Si faltan plugins/configuración, preparar y autorizar su instalación antes de
habilitar nada; no regenerar claves ni ampliar permisos.

Aprobar el commit local de build, publicar solo la rama editorial y alinear
coordinador, promotor, dispatcher y SALERO_CODE_SHA con ese SHA. Los cambios
remotos necesarios deben autorizarse; no se realizaron en esta preparación.

Verificar journal/outboxes limpios de ambigüedad. Habilitar consumidores
(promotor y Actions/READY), después el coordinador autenticado y al final los
hooks del WordPress aislado. Publicar una sola vez el borrador autorizado:
begin → exportación consistente → offer → notify → build → promoción → monitor.
Debe abrir una generación nueva; no reutilizar ni reintentar el job sintético
terminal de generación 1.

Comprobar identidad de snapshot/generación/job/SHA/recibo, deployment preview
success, HTTP 200, texto completo sin JS, título/descripción, canonical del
preview, JSON-LD, noindex, ausencia de Analytics, listado y recursos.

Cerrar primero la entrada WordPress; reconciliar el trabajo y después cerrar
READY/Actions/promotor/acceso editorial temporal. Ante un resultado ambiguo,
consultar antes de repetir; no borrar journals/SQLite ni forzar desbloqueos.
Conservar el preview manual válido como referencia. Producción, DNS y main
quedan fuera de todas estas operaciones.
