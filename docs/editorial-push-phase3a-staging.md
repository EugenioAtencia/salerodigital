# Fase 3A — infraestructura aislada de staging

Fecha de inspección: 2026-10-08. Preparación parcial: los recursos remotos nuevos no están creados y Fase 3B no está autorizada para comenzar.

## Evidencia de estado real

- Rama local `codex/github-snapshot-integration`, código integrado aprobado `2b75901f5275234fcf1b0b1bd918bdee4f69d60d`. La preparación de este documento no modifica el código del pipeline.
- `origin/main` sigue en `8283cebe5db420ecb0e4671cc99b21badee2288b`, comprobado mediante `git ls-remote`. No se ha hecho push, merge ni deployment.
- Pages producción `salerodigital`: deployment `610cc02c-e488-4dcf-a2ca-929be3c4c80b`, success, mismo SHA de main. Build command y root vacíos; output `.`. Sin cambios de configuración.
- Pages existente `salerodigital-staging`: deployment `7476fceb-48ee-4eb1-a9d0-63b503533225`, success, SHA `8d7261c77930135893458f32f65424ae8383cfb1`; rama `codex/cms-auto-deploy`, build `node scripts/pages-preview-build.mjs`. Es el staging antiguo; todavía NO consume snapshots GitHub.
- Workers existentes: `salero-wordpress-mcp` y `web360-mcp`. DO existente: `web360-mcp_Web360MCP`, SQLite. No reutilizar ninguno para el coordinador editorial.
- GitHub conector autenticado como `EugenioAtencia`, administrador del repositorio de código `EugenioAtencia/salerodigital`. Los cinco repositorios enumerados no contienen el repositorio editorial previsto.
- Chrome está autenticado en GitHub como `Eugenio-Atencia`; el formulario de creación solo ofrece ese propietario. Son cuentas diferentes. Está pendiente confirmar propietario y disponer de una sesión autorizada para él. No crear recursos en la cuenta incorrecta.
- SiteGround: la herramienta WordPress Staging permite seleccionar `https://cms.webagencia360.com/`, pero no muestra copias existentes. No se pulsó CREAR. La inspección SSH solo encuentra dos instalaciones: CMS de producción y `webagencia360.com`; ninguna se acepta como entorno aislado.
- WP-CLI de producción, solo lectura: PHP 7.4.33, WP 7.1.3, plugin cargado, flag efectivo OFF, pendientes 0, cron propio 0, lock ausente. Revisión `e41bef688389dfa5f0a75250749d420ab3e5db6a780a10fa1a082e54bbe7aad5`, editing=false. Dos GET públicos devuelven 200 JSON y esa misma revisión.
- La Home de producción carga en Chrome. Las peticiones HTTP del cliente CLI a producción recibieron 403 de Cloudflare; no se presenta esa vía como una comprobación HTTP 200 ni se atribuye la causa sin evidencia adicional.

## Límites y consumo

Cuenta Cloudflare inspeccionada: `0bd72789f683471596f05b6d0c4653fc`. Plan Workers Free confirmado en el panel; no se activó Paid, R2 ni facturación.

| Recurso | Cuota gratuita | Uso observado | Interpretación |
| --- | --- | --- | --- |
| Workers | 100.000 solicitudes/día; 10 ms CPU por invocación; 100 Workers | 1.462 solicitudes hoy; 2 Workers | 98.538 solicitudes restantes en el momento de la lectura; consumo compartido y variable |
| DO SQLite | 100.000 solicitudes/día; 13.000 GB-s/día; 5 millones filas leídas/día; 100.000 filas escritas/día; 5 GB | 24,12 MB almacenados; solicitudes, duración y filas del día: 0 en el panel | Hay margen; probar CPU y filas en despliegue real antes de declarar aptitud |
| Pages | 500 builds/mes | 49 registros de deployments de octubre: 29 producción y 20 staging | Los registros NO son el contador de builds facturables; saldo mensual exacto pendiente de medidor |

Sin cuota nueva obligatoria prevista para estos recursos en Free. No constituye una garantía de capacidad: al alcanzar límites gratuitos pueden fallar operaciones. No habilitar upgrades automáticos ni aceptar pago. El almacenamiento y coste de la copia SiteGround dependen de la capacidad incluida en el contrato actual, aún pendiente de confirmar; ver 2 GB e inodos usados no demuestra espacio disponible.

Fuentes oficiales: [Workers precios](https://developers.cloudflare.com/workers/platform/pricing/), [Workers límites](https://developers.cloudflare.com/workers/platform/limits/), [DO precios](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Pages límites](https://developers.cloudflare.com/pages/platform/limits/).

## Recursos preparados, aún no creados

1. Repositorio privado independiente `<propietario-confirmado>/salero-editorial-snapshots-staging`, rama `snapshots`. Plantilla existente `integrations/github/editorial-repository/`. Actions y GitHub Pages desactivados; sin LFS, sin force-push ni borrado ordinario de referencias. Configurar y verificar protección compatible con el plan disponible sin contratar upgrades. Semilla vacía controlada, sin copiar credenciales ni datos personales del CMS.
2. GitHub App privada, diseño `integrations/github/github-app-design.json`: Contents write y Metadata read; sin permisos de cuenta u organización, webhooks, eventos ni OAuth. Instalar SOLO en ese repositorio. El token de instalación solicita explícitamente ese repositorio; clave privada únicamente como secret del Worker de staging. No instalar en el repositorio de código. Los roles builder/monitor nunca reciben la clave GitHub.
3. Worker `salero-push-staging` y DO SQLite `EditorialCoordinator` nuevos. Configuración local separada `integrations/cloudflare/push-staging/wrangler.phase3a.jsonc`: ENVIRONMENT=staging, CODE_SHA fijado al código revisado, propietario UNCONFIGURED, sin rutas, cron, preview URLs ni workers.dev público. El dry-run valida el empaquetado, NO crea namespace ni verifica acceso remoto.
4. Secretos editor/builder/monitor diferentes y nuevos, más signing key de snapshot y credenciales App de staging. Generarlos y entregarlos por canales seguros al provisionar; nunca Git, logs, argumentos de shell ni recibos. La ausencia de credenciales mantiene cerrado el transporte. No reutilizar claves del CMS o pipeline de producción.
5. Preparar un acceso RPC de staging explícito y separado cuando se pueda autenticar: el draft sin URL pública no es conectividad operativa. No crear rutas en dominios de producción. Verificar rechazo de firmas, roles y replay antes de cualquier escritura editorial.

Permisos de gestión Cloudflare: para crear el Worker nuevo es necesario bootstrap con Workers Admin; los permisos de un Worker individual solo se pueden acotar cuando existe. Después revocar bootstrap y usar Editor limitado a `salero-push-staging`; ningún permiso DNS/Routes de producción. Verificar permisos de DO y Pages en la interfaz actual y no asumir que un token con alcance de cuenta está limitado al proyecto staging. No se han creado tokens ni otorgado permisos nuevos. El token disponible se empleó para consultas de inventario, no para desplegar staging.

Fuentes: [roles Workers](https://developers.cloudflare.com/workers/authorization/workers/), [roles DO](https://developers.cloudflare.com/workers/authorization/durable-objects/), [registro App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app).

## Plan de WordPress aislado antes del primer arranque

La herramienta SiteGround existe, pero no se ha comprobado que permita sanear una copia antes de ejecutar WordPress. No basta con clonar y apagar correos después. Si no puede garantizarse el orden siguiente, preparar una copia offline/local en un entorno con red controlada; no lanzar una copia pública insegura.

1. Confirmar espacio, base de datos y staging incluidos en el plan actual. Detenerse ante cualquier suscripción, método de pago o condición de facturación. Asignar directorio y DB distintos; documentar rutas reales solo después de crearlos.
2. Mantener la copia cerrada al tráfico web, sin tareas cron y sin arranque de WordPress mientras se sanea. Usar copia mínima de datos editoriales; si se necesita backup completo, tratarlo como sensible y eliminar usuarios, pedidos, formularios y otros datos personales no necesarios.
3. Antes del bootstrap: retirar secretos de producción de wp-config, opciones, variables, SMTP, cachés/drop-ins y configuración de plugins; credenciales DB/usuarios de staging independientes. Quitar Hooks, tokens Cloudflare, claves GitHub de producción y colas programadas copiadas. No conectar plugins de terceros a cuentas reales.
4. Establecer en staging DISABLE_WP_CRON=true y SALERO_PAGES_ENABLED=false; quitar cron del sistema para esa copia. No modificar estas constantes en producción. Instalar protección local que bloquee wp_mail y configure un sumidero local. Bloquear también salida SMTP/mail nativa y las notificaciones/webhooks que no pasan por wp_mail: el filtro PHP por sí solo NO demuestra aislamiento.
5. Aplicar salida de red denegada por defecto con lista permitida del Worker staging, más dependencias estrictamente necesarias. No permitir el Hook ni APIs de despliegue de producción. Si SiteGround no ofrece control suficiente, no certificar aislamiento: usar entorno local con control de red. No presupuestar firewall ni capacidad de hosting no confirmados.
6. Protección HTTP y noindex; URLs, cookies, base de datos, uploads y ACF apuntan a la copia. No modificar archivos multimedia compartidos con producción. Restringir operadores: la función SiteGround de publicar staging en live no debe formar parte del procedimiento ni de sus credenciales operativas.
7. Verificar, sin cambios editoriales reales: DB separada; flag OFF; cero tareas heredadas; ningún secreto de producción; correo capturado solo localmente; llamadas prohibidas bloqueadas; autenticación del Worker staging; sin notificaciones externas. Registrar únicamente resultados sanitizados. Solo entonces autorizar pruebas de Fase 3B.

Estado actual: estos controles son un PLAN, no controles ya instalados ni verificados. No hay WordPress aislado listo.

[SiteGround Staging](https://www.siteground.com/tutorials/staging/create-staging)

## Primer ciclo completo — pendiente de Fase 3B

Antes del ciclo, conectar barreras reales WordPress, outbox durable y control de escritores. Los helpers y simulaciones existentes no prueban por sí solos cobertura de wp-admin, REST, ACF, taxonomías, medios y WP-CLI real. Deben distinguir borrador privado y modificación visible. Durante incidencias, el contenido visible que requiera reservar generación se bloquea antes de la escritura; los borradores permitidos no pueden alterar dependencias públicas. Mostrar un error recuperable sin bloquear globalmente wp-admin.

1. En la copia aislada y con claves de staging, reservar generación en el coordinador antes de una edición visible; confirmar estado durable. Ningún cambio de producción.
2. Modificar un único dato de prueba, exportar las cuatro colecciones completas con revisión inicial/final iguales, validar integridad, duplicados y counts; firmar SHA-256.
3. Subir mediante el coordinador y App limitada; verificar blob/tree/commit/manifiesto y readback GitHub. Ante confirmación perdida reconciliar la misma operación idempotente; nunca aceptar un snapshot viejo como fallback.
4. Autorizar un build por generación y código aprobados. El builder lee exclusivamente el snapshot por commit/hash autorizado, nunca SiteGround. Probar final fence y exclusión de promoción antigua.
5. El build aislado actual genera salida y recibo con publicationAuthorized=false. Hace falta conectar un promotor/monitor real SOLO a Pages staging, con recepción terminal y reconciliación, antes de afirmar ciclo publicado. No basta con poner ese script en Build command y suponer publicación protegida.
6. Verificar Home, cuatro matrices y once páginas individuales, recibo, HTML inicial, SEO, renderers y Nuestros menús sin cambios. Medir CPU real, filas SQL, API GitHub y builds; las simulaciones locales no representan uso facturable real.
7. Simular fallo controlado, edición concurrente, timeout, snapshot corrupto/antiguo, ACK perdido y reinicio; demostrar recuperación y que un build antiguo no se promueve. Ejecutar solo tras autorización de Fase 3B.

## Pruebas y recuperación

La batería local completa `scripts/test-push-github.mjs` se reejecutó con Node 22 y PHP 7.4.33 y terminó con exit 0. Exportador: 41; coordinador: 62; transporte/política: 39; GitHub: 22; páginas snapshot: 41; colecciones: 78; Worker/SQLite local: 29 comprobaciones PASS. Sectorial, fetch JSON, casos, menús, middleware/schema, editorial build y MU-plugin también PASS. Los errores HTTP simulados de casos son deliberados y la suite confirma su recuperación. No son fallos del CMS real. El dry-run Wrangler no sube código ni crea recursos. Sin POST al Hook, cambios WordPress ni pruebas editoriales reales.

Rollback de esta preparación: retirar únicamente el draft y documentación local si se desea; no hay recursos remotos nuevos que deshacer. En el futuro, detener primero productores/promotores de staging, conservar journal DO y referencias GitHub para reconciliar estados inciertos; no borrar una generación en publicación incierta. Revocar claves de staging, deshabilitar su endpoint y conservar último deployment válido. Ninguna operación de rollback utiliza producción.

## Condiciones para Fase 3B

- Propietario GitHub confirmado y sesión autorizada; repositorio privado y App instalados con alcance comprobado.
- Worker/DO creados en Free y secretos independientes; conectividad y permisos negativos probados.
- WordPress aislado saneado antes de arrancar, controles de correo/red y capacidad de hosting verificados.
- Barreras WordPress, outbox y promotor/monitor staging conectados y revisados.
- Medidor Pages y límites CPU/SQL comprobados; autorización nueva para la prueba editorial real.

Fase 3A: preparación local e inventario completados; provisión y validación remotas pendientes. Fase 3B lista: NO.
