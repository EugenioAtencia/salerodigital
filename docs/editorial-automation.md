# Automatización editorial — preparación Fase 2A

Base verificada: `69662e44066d9c46db945ac3841efeb75863bee5`, rama `codex/cms-auto-deploy`.
CMS público: https://cms.webagencia360.com/; hosting SiteGround confirmado por el propietario.
La ruta física de WordPress y la configuración de cron externo **no están confirmadas**.
Esta preparación no instala nada, no crea secretos ni Hooks reales, no cambia Pages/WordPress ni hace merge.

## Flujo preparado

```text
Evento público WordPress → registro durable por petición + revisión opaca
  → debounce 60 s → worker WP-Cron con lease → Deploy Hook privado (main)
  → build Node 22 → tests críticos → revisión antes → REST completo
  → render en memoria → segundo REST completo → comparación + revisión
  → escritura en directorio desechable → revisión final → recibo de build
  → Pages promueve solamente build correcto
  → worker consulta API de Cloudflare + recibo → confirma A; conserva B
```

Un HTTP 200 del Hook es aceptación, no confirmación de publicación. El worker consulta
el deployment específico y solo confirma sus eventos cuando la etapa `deploy` tiene
`success`, rama `main`, entorno `production` y recibo válido de build editorial.
El token Cloudflare de lectura se utiliza exclusivamente desde el servidor WordPress.

## Build exacto y Preview

Comando de producción **propuesto, aún no configurado**:

```sh
node scripts/build-editorial-ssg.mjs
```

Directorio raíz: raíz del repositorio (configuración actual vacía). Output: `.`.
Node fijado a `22.16.0` en `.nvmrc`; sin dependencias ni framework nuevo.
El build ejecuta sectorial, colecciones/SSG/middleware/schema, fetch JSON, casos y
menús antes de consultar el CMS. No consulta secretos ni escribe WordPress.

En 2A falta deliberadamente el endpoint de revisión del MU-plugin. Para Preview:

```sh
node scripts/build-editorial-ssg.mjs --snapshot-check
```

Es el mismo pipeline con dos lecturas completas comparadas, sin revisión del servidor.
Es un modo explícito de preparación, **no una garantía de atomicidad editorial final**.
Producción `salerodigital` conserva el build command vacío. La validación usa el
proyecto separado `salerodigital-staging`, con comando explícito:
`node scripts/pages-preview-build.mjs`. El intento histórico de arrancar mediante
`postinstall` en el proyecto sin build command no funcionó: Pages omitía instalación
y build. Staging sí instala npm; mantener `postinstall` duplicaría el pipeline.
Se ha retirado. npm solo instala; el Build command es el único punto de entrada.
La prueba exige logs y `salero-build.json` con SHA/rama correctos. Los diagnósticos
son códigos y motivos fijos, etapa y colección; nunca cuerpos HTTP/URLs/credenciales.
El recibo incluye estado de tests, snapshot y éxito. El error original de staging
no tenía diagnóstico interno; una ejecución local idéntica pasó, por lo que no se
atribuye retrospectivamente a una colección ni al CMS sin evidencia.

En 2B, sustituir el comando de staging por el build normal con revisión obligatoria
únicamente tras aprobación y coordinación del endpoint.
Nunca configurar `--snapshot-check` como build de producción automatizado.

## Consistencia y fallos

Cada petición REST lleva `cache: no-store` y una clave aleatoria distinta; se validan
HTTP, JSON, registros públicos, IDs/slugs únicos, totales y todas las páginas.
Una colección vacía solo es válida con array vacío y totales REST cero coherentes.
No se usa una instantánea de Git como fallback ante CMS roto.
Se calculan hashes sobre las colecciones completas, incluyendo datos embebidos.
Si dos lecturas difieren o cambia la revisión editorial, el build falla.
El pequeño callback `beforeWrite` del generador permite validar antes de escribir;
su comportamiento por defecto anterior se conserva.

La revisión pública contiene únicamente un SHA-256 opaco y `editing` booleano.
Se rechazan ediciones pendientes de finalizar. Se lee por SQL para evitar una época
obsoleta por caché de opciones. No dispara builds ni expone cola, Hook o token.
Se comprueba antes, después de leer y al terminar de escribir. Cualquier error
produce exit distinto de cero, incluido el fallo posterior a las escrituras: esa
carpeta desechable nunca debe subirse/promoverse manualmente.
Cloudflare debe conservar la producción anterior al fallar el build.
`salero-build.json` es un recibo público sin secretos: hashes, conteos, SHA, rama,
fecha y modo. No contiene el contenido privado de la cola.

## MU-plugin portable: revisión y publicación

Archivo preparado: `integrations/wordpress/salero-pages-publish.php`.
Destino relativo estándar:
`wp-content/mu-plugins/salero-pages-publish.php`.
La reconciliación conserva exactamente el archivo portable instalado en el CMS,
verificado con PHP 7.4.33 y WordPress 7.1.3, sin configuración privada ni secretos.

`SALERO_PAGES_ENABLED` controla publicación. Ausente o `false`, registra
observadores y GET `/wp-json/salero-pages/v1/revision`; los cambios relevantes
actualizan la revisión y `editing`. Conserva eventos durables inertes hasta aprobar
su tratamiento, sin worker, cron, lease, procesamiento de cola ni HTTP externo.
Un `tick()` directo retorna sin efectos. Autosaves y revisiones se ignoran.
Con `true` conserva cola, debounce, lease, reintentos, serialización A/B y recibos.

El Hook exige HTTPS, host exacto `api.cloudflare.com` y path
`/client/v4/pages/webhooks/deploy_hooks/{identificador}`, sin credenciales, query,
fragmento, puerto ni paths alternativos. Las peticiones no siguen redirecciones.
Los tests usan únicamente identificadores ficticios.

Tipos internos verificados mediante REST `/wp/v2/types`: `post`, `servicio`,
`sector`, `caso_exito`; sus bases REST plurales no son los nombres internos.

Hooks: `pre_post_update`, `transition_post_status`, `wp_after_insert_post`,
`before_delete_post`, filtros add/update/delete de meta, `set_object_terms`,
`edit_terms`, `pre_delete_term`, medios referenciados, `shutdown`, WP-Cron y
registro REST. Detectan publicar/retirar/restaurar, título/extracto/contenido/fecha/slug,
ACF consumido por tarjetas, categorías e imágenes/vídeos referenciados por ID.
Se ignoran borradores, revisiones, autosaves y meta administrativa (`_edit_lock`, etc.).
Los campos ACF vigilados están listados en el archivo y deben mantenerse alineados
con los renderers si estos evolucionan. Los medios externos escritos como URL no
emiten eventos de WordPress; cambios en su origen requerirían una regeneración manual.

## Secretos y configuración pendiente

Configurar únicamente en `wp-config.php` privado o mediante variables privadas del
servidor referenciadas por él, nunca en este archivo/repositorio ni en REST/JS/HTML:

- `SALERO_PAGES_ENABLED`: inicialmente `false`; habilitar solo tras aprobar 2B.
- `SALERO_PAGES_DEPLOY_HOOK`: URL privada de Hook exclusivamente asociado a `main`.
- `SALERO_PAGES_READ_TOKEN`: token de API con permiso **Cloudflare Pages: Read**
  restringido a la cuenta necesaria; sin permisos de escritura/administración.
- `SALERO_PAGES_ACCOUNT_ID`: identificador de esa cuenta.

No incluir valores reales en documentación, consola, soporte público o código.
El plugin almacena códigos fijos de error; nunca guarda cuerpos HTTP, URL de Hook,
Authorization o WP_Error completo. El endpoint REST es exclusivamente de lectura.
No hay endpoint público para regenerar ni interfaz administrativa adicional.
Verificar que monitorización del hosting no registra URLs/cabeceras privadas.

## Debounce, durabilidad, reintentos y concurrencia

Cada petición editorial crea una opción UUID propia (no autoload), actualizada por
sus distintos hooks; se completa en `shutdown`. No hay contador compartido que pueda
perder cambios simultáneos. El último evento debe tener al menos 60 s antes de enviar.
Lease por `add_option` y compare-and-delete SQL: un worker por vez, caducidad 120 s.
El estado guarda snapshot de eventos A antes del POST; B queda en opciones separadas.
Al confirmar A se eliminan solo sus eventos. Después se procesa B.
Se espera también si la API muestra un build de producción en curso, incluido Git.

Reintentos: 60, 120, 240… hasta 3600 s; eventos siempre persistentes. Errores 4xx
explícitamente rechazados se reintentan. Fallos de build permiten nuevo intento.
Timeout/5xx/cierre tras POST pueden significar aceptación: se conserva `active` y
se consulta la API, sin reenviar un POST que pueda duplicar un build. Sin ID, solo
se asocia si hay exactamente un deployment `deploy_hook/main` posterior al envío.
Respuesta ambigua, varias coincidencias o API inaccesible conservan pendientes y
requieren reconciliación administrativa si no se pueden resolver automáticamente.
No se promete retry ciego ante resultado desconocido: evita despliegues simultáneos.
Un evento incompleto por fatal/crash bloquea nuevos builds de forma segura hasta
revisar el estado real del CMS y reconciliar manualmente; no se elimina por tiempo.

La serialización cubre esta cola. Git pushes, otros Hooks y acciones manuales son
publicadores externos: en 2B coordinar una única vía editorial y no lanzar producción
concurrentemente fuera de ella. Pages no ofrece aquí una promoción condicionada a la
revisión de WordPress; una edición posterior al último check y anterior a promoción
puede producir un intervalo breve con la versión previa hasta el siguiente build.
El control de revisión evita aceptar lecturas mezcladas detectadas, no una transacción
atómica entre dos plataformas. Las mutaciones vía SQL directo/elusión de hooks y las
cachés REST que ignoren tanto query única como no-store deben verificarse en 2B.

## Cron: pendiente en Fase 2B

WP-Cron funciona con visitas si no hay otro disparador. Eso no garantiza reintentos
en un CMS headless sin tráfico. No activar la automatización sin verificar SiteGround.
Tras confirmar ruta y mecanismo, recomendar un cron externo cada minuto con WP-CLI
`wp cron event run --due-now --path=<ruta-confirmada>` y el usuario/PHP adecuados.
Si no hay WP-CLI, un cron externo puede llamar al `wp-cron.php` del CMS; verificar
firewall/caché y ejecución real. No se configura nada ahora. Solo valorar
`DISABLE_WP_CRON=true` una vez demostrado el disparador externo, nunca antes.

## Alcance conservado y sitemap

Regenera Home y cuatro matrices, ItemList y páginas `/la-rebotica/page/{n}/`.
No modifica renderer individual de artículos, servicios, casos ni landings sectoriales.
`generate-sectors-ssg.mjs` es otro proceso y no se conecta a esta cola.
No cambia CSS, URLs, schema source ni WordPress. El antiguo fallo `plainListHtml`
ya está corregido en el test integrado en la base.
`sitemap.xml` es estático: no incorpora automáticamente nuevos registros/páginas.
No se amplía en 2A; la paginación queda descubierta mediante enlaces HTML.
La actualización del sitemap y la incidencia independiente CORS/cache de SiteGround
quedan pendientes; SSG servidor a servidor no depende de CORS del navegador.

## Pruebas reproducibles sin deploy real

```sh
npm test
php -l integrations/wordpress/salero-pages-publish.php
php tests/editorial-mu-plugin-simulation.php
php tests/editorial-mu-plugin-simulation.php --disabled
php tests/editorial-mu-plugin-simulation.php --autosave
php tests/editorial-mu-plugin-simulation.php --disabled --autosave
php tests/editorial-mu-plugin-simulation.php --unset-enabled
php tests/editorial-mu-plugin-simulation.php --url-validation
```

JS incluye middleware/schema dentro de colecciones (78 checks de la suite aprobada).
Nuevos tests: CMS 500, HTML, parcial, duplicado, timeout, vacío sin confirmar,
colecciones/revisión cambiantes, edición en curso, build con revisión válido, vacío
legítimo y fallo del CLI con exit 1. PHP usa WordPress/HTTP/SQL simulados, cero red:
agrupación, ruido, cambios públicos/ACF/términos/medios, lease, backoff, timeout
ambiguo, aceptación vs completion, A/B, fallo de build y ausencia de secretos públicos.
No sustituyen una prueba integrada de hooks/cron/ACF/cache reales, reservada a 2B.

## Secuencia exacta posterior — requiere aprobación Fase 2B

1. Revisar diff/Preview, comprobar main y aprobar integración; no hacerlo en 2A.
2. Confirmar ruta física, PHP/WordPress, almacenamiento privado, caché REST y cron.
3. Preparar plugin en destino relativo confirmado y constantes con enabled=false.
4. Integrar código aprobado y preparar cambios Pages coordinados.
5. Con publicación OFF, verificar endpoint de revisión estable, JSON/no-store y cola;
   comprobar ausencia de worker, cron y HTTP externo. Antes de activar ON, revisar
   explícitamente los eventos acumulados en OFF; no vaciarlos automáticamente.
6. Configurar build `node scripts/build-editorial-ssg.mjs`, output `.`, raíz actual;
   validar build con revisión. No activar un build sin endpoint; conservar producción
   actual mientras se completa el despliegue válido.
7. Crear Hook `Salero CMS Publish` asociado a main y token Read limitado; almacenar
   valores exclusivamente en servidor privado; comprobar monitor y recibos.
8. Verificar/configurar cron externo SiteGround, demostrar ejecuciones/reintentos,
   luego activar disparador editorial completo de forma coordinada.
9. Hacer una edición editorial real autorizada; comprobar debounce, build, SHA,
   revisión, receipt, tarjetas/enlaces/schema, consola y HTTP en producción.
10. Comprobar cambio B, fallo controlado fuera de producción y recuperación de cola;
    documentar operación y rollback. Poner publicación OFF conserva el endpoint;
    retirar el archivo MU lo elimina: coordinar su retirada con devolver el Build
    command a vacío, conservando el último deployment válido.

Hasta aprobación expresa: no merge, Hook, instalación, cambios de Pages/WordPress/hosting.

Fuentes verificadas: [build image](https://developers.cloudflare.com/pages/configuration/build-image/),
[build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/),
[Deploy Hooks](https://developers.cloudflare.com/pages/configuration/deploy-hooks/),
[Pages API](https://developers.cloudflare.com/api/typescript/resources/pages/),
[pre_delete_term](https://developer.wordpress.org/reference/hooks/pre_delete_term/).
