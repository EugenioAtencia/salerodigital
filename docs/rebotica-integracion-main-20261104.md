# Preparación de La Rebotica — 4 de noviembre de 2026

## Resultado WordPress staging6

Instalados exclusivamente en `staging6.cms.webagencia360.com/wp-content/mu-plugins/`, con el contenido confirmado en `68c7f2f790e95476681a18194345b3491f996172`:

- `salero-rebotica-journal.php`
- `salero-editorial-snapshot.php`
- `salero-editorial-push-staging.php`
- `salero-rebotica-staging.php` (instalado al final, después de los helpers)

El publicador legado no se ha modificado. La configuración independiente permanece fuera del webroot, en `salero-staging-private/rebotica-config.php`, con `SALERO_PAGES_ENABLED=false` y `SALERO_REBOTICA_STAGING_ENABLED=false`. No se han cargado ni regenerado claves.

Se han actualizado únicamente las dos opciones `home` y `siteurl`, condicionando el UPDATE a su valor HTTP anterior y a los nombres exactos. Resultado: dos filas afectadas; ambas son ahora `https://staging6.cms.webagencia360.com`.

Verificación posterior mediante HTTPS: portada, índice REST, colección de posts y endpoint de revisión devuelven 200. Portada noindex, `blog_public=0`, revisión sin cambios y `editing=false`. SELECT posterior a las visitas: cero filas de journal/attempts/state/lock, cero cron editorial, dos eventos legacy completos conservados. No hay outbox de Rebotica porque su journal sigue ausente.

Los tres posts publicados y el auto-draft conservan exactamente sus huellas MD5 de título, contenido, excerpt, slug y fecha de modificación:

| ID | Estado | Huella anterior y posterior |
| --- | --- | --- |
| 43 | publish | 9b5cb061e2fa152b64d8cef5346853a7 |
| 223 | publish | 80152259974824a06d4bc603a4a8ef7b |
| 325 | auto-draft | b3353d4e50a71a53b2f152dd871becc6 |
| 326 | publish | a0aed6195518419f85c5783834ed303f |

## Integración local

Rama `codex/rebotica-integracion-main`, creada en un worktree independiente desde `main` en `7ed1b203d7c908223a1450ca716933cc2cb2d60f`. Se incorpora el delta editorial confirmado de la rama antigua mediante aplicación a tres vías; se excluye todo su trabajo diagnóstico sin confirmar. Las huellas de sus 15 archivos modificados/no seguidos permanecen iguales.

Se conserva el middleware actual y todos los renderers actuales de producción, CSS, páginas locales y contenido. El único conflicto de ruta se resuelve utilizando el renderer servidor actual como fallback. El generador de snapshots reutiliza ese renderer actual para conservar títulos SEO, descripciones, BlogPosting, FAQs, navegación e índice. Las rutas con snapshot certificado no vuelven al renderer cliente antiguo.

La política generada solo para el artefacto de staging sirve artículos, listado, paginación y sitemap desde bytes certificados. Evita que el middleware dinámico posterior de main consulte el CMS de producción para esas rutas. Conserva hashes, noindex, canonical/schema de preview y eliminación de Analytics. El artefacto incluye las tres landings SEO locales y favicon.svg que la lista antigua no contemplaba.

La prueba antigua que exigía una reescritura wildcard de servicios se actualiza para conservar el comportamiento actual de Functions/404, sin restaurar `_redirects` obsoleto.

## Validación

- Sintaxis PHP correcta en los cuatro componentes.
- Suite `scripts/test-rebotica-editorial.mjs` completa: PASS con Node 22.16.0 y PHP 8.3.33.
- Incluye generador, snapshot, exportador, hooks simulados, SEO HTTP/editorial (47 checks), listado vivo y empaquetado real Cloudflare (8 checks, compilación Functions y ejecución workerd local).
- Regresión de preview: SEO actual, índice, CSS responsive, landings, archivos públicos, listado/sitemap sin CMS, noindex, rechazo de hostname de producción y hashes certificados: PASS.
- Middleware, renderer de artículos, listado dinámico, schema, renderer de servicios y sitemap de producción idénticos byte a byte a main.
- No se han efectuado llamadas editoriales reales, push, merge, activaciones ni deployments.

## Pendiente antes de una publicación automática

La preparación local y del WordPress está completada, pero la prueba automática todavía necesita autorización para publicar la rama revisada y alinear los SHA en coordinador, promotor y dispatcher. También habrá que configurar en el clon las referencias y claves existentes autorizadas, verificar el disparador cron de staging, releer journals y habilitar temporalmente los componentes necesarios. No se ha ejecutado begin, offer, notify ni prepareRetry.

Mantener Actions, READY, promotor y entrada editorial cerrados hasta esa autorización. La generación 1 fallida y todos los journals deben conservarse. La futura prueba debe ser una única actualización explícitamente autorizada del ID 326 en staging, con verificación del deployment y cierre de las habilitaciones temporales.
