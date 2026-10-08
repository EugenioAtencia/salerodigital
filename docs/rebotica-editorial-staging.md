# Integración editorial de La Rebotica — staging

Base de producción: `837db72f99312bcf68c0739a6d4cf6ec718ab521`.
Rama: `codex/rebotica-editorial-staging`. Componentes recuperados de
`codex/github-snapshot-integration` (`0dd128c76a33d13437117349a767b11e1f8b09f7`).
No merge ni activación de producción. La integración real queda pendiente hasta
completar acceso a WordPress aislado, App, secretos y pruebas completas.

## Alcance

El generador usa los renderers existentes. Regenera exclusivamente el listado,
paginación, artículos y entradas del sitemap de La Rebotica. Home, Nuestros menús,
servicios, sectores y casos se copian del código autorizado sin regenerarlos.
Las Functions de artículos sirven el HTML certificado por su recibo; un artículo
retirado responde 404, sin consultar WordPress ni recuperar un snapshot anterior.
Los deployments anteriores sin recibo coordinado conservan su handler para rollback.

El snapshot de esta integración contiene la colección completa de **artículos
públicos**. Las otras tres claves del formato mantienen arrays/counts cero y no
se interpretan como instrucciones para retirar servicios, sectores o casos.
No se envían borradores ni contenido protegido. Imágenes destacadas y sus alt,
categorías y etiquetas referenciadas deben estar resueltas y coincidir con sus IDs.
Se mantienen enlaces internos; los enlaces a artículos conocidos del snapshot
se traducen a sus rutas públicas. Otros destinos no se adivinan ni se reemplazan
indiscriminadamente. La exportación realiza dos lecturas internas paginadas y
comprueba la revisión antes, entre ellas y después; el build no consulta SiteGround.

## Máquina de estados y editores

1. Antes de cambiar contenido visible, WordPress guarda un intento durable y
   obtiene un permiso `begin` firmado del coordinador. Sin ACK no se escribe.
2. Se registra un evento por petición, agrupando hooks de publicación, metadatos,
   relaciones y cambios en medios referenciados. MySQL GET_LOCK serializa los
   escritores. La finalización marca el evento completo; un fatal no lo completa.
3. El journal se congela durante la exportación. El snapshot firmado queda en el
   outbox antes de enviarse. Fallos de red conservan exactamente esos bytes.
4. GitHub almacena blobs SHA-256, manifiesto y commit verificable; la referencia
   avanza sin force. SQLite solo confirma el head tras verificar la pertenencia,
   firma, revisión y hashes. No existe transacción conjunta GitHub/SQLite.
5. Después del ACK del manifiesto, un `repository_dispatch` con identidad estable
   solicita el build. El outbox conserva la notificación hasta el ACK; no hay
   segundo disparador en el push de Git. Una respuesta perdida puede duplicar
   entregas con el mismo job; DO y la exclusión de promoción impiden dos uploads.
6. Actions usa el SHA de código autorizado y la generación exacta, verifica el
   snapshot autorizado por DO y genera artefactos aislados. `preparePromotion`
   adquiere el bloqueo final **antes** del único upload permitido a Pages staging.
7. El monitor separado comprueba SHA, entorno Preview, estado terminal y recibo
   en la URL inmutable del deployment. Solo entonces marca la generación publicada.
   Un timeout tras el upload mantiene el bloqueo; nunca reenvía a ciegas ni expira
   automáticamente el bloqueo de publicación.

Durante una incidencia sin permiso confirmado se permiten borradores, revisiones,
medios no referenciados y administración ajena al blog. Se bloquean publicación,
actualización/retirada de contenido visible y sus medios/taxonomías. Con permiso
confirmado, cambios locales pueden guardarse aunque falle después el envío; Pages
permanece en su versión confirmada. Durante exportación congelada, publicación o
resultado incierto se bloquean nuevas mutaciones visibles. No es un bloqueo global
 de wp-admin. Ediciones de SQL directo, plugins que eviten hooks y modificaciones
manuales de archivos de medios están fuera del protocolo y deben prohibirse para
el ensayo. La cobertura de hooks reales debe verificarse con WordPress aislado.

## Recursos y credenciales separados

- Repositorio privado: `EugenioAtencia/salero-editorial-snapshots-staging`, rama
  `snapshots`; Issues/Projects/Wiki y Actions deshabilitados inicialmente. Sin
  integración Git de Pages ni acceso a repositorios de código para la App.
- Worker: `salero-push-staging`; DO SQLite `EditorialCoordinator`, namespace propio.
  Sin rutas de producción, R2, cron Worker ni dependencia de los MCP existentes.
- Pages permitido por los scripts: **salerodigital-staging**, branch Preview
  `codex/rebotica-editorial-staging`. Nunca salerodigital ni un Deploy Hook.
- GitHub App privada, instalada solo en el repositorio anterior: Contents write,
  Metadata read, sin webhook ni permisos de cuenta/organización/Actions/Workflows.
  El endpoint repository_dispatch admite Contents write. El token de instalación
  se acota al repositorio y se renueva; el PEM queda solo como secreto del Worker.
- Worker: cuatro claves aleatorias independientes (EDITOR_KEY, BUILDER_KEY,
  MONITOR_KEY, SNAPSHOT_KEY), App ID/Installation ID/PEM. No están en Git.
- WordPress staging: editor+snapshot keys y URL del Worker, guardados fuera del
  webroot. No App PEM ni tokens Cloudflare. `SALERO_PAGES_ENABLED=false` continúa;
  la autorización aislada usa otra constante, `SALERO_REBOTICA_STAGING_ENABLED`.
- Actions builder: builder+snapshot keys, token Pages Edit para la cuenta de
  staging. Monitor: monitor key, token Pages Read. Entornos separados. Pages
  permisos de API son por cuenta; verificar este alcance antes de crearlos. Los
  scripts fijan el proyecto permitido, pero eso no convierte el token en un permiso
  criptográficamente limitado a un único proyecto.

## Preparación pendiente y primera prueba real

1. Confirmar ruta/SSH/WP-CLI de staging6; la sesión actual solo identifica el CMS
   de producción. Verificar DB propia, backups, noindex y guardas de correo/HTTP,
   integraciones heredadas OFF y ausencia de destinos de producción. No escribir
   hasta poder demostrarlo. No activar Basic Auth.
2. El propietario EugenioAtencia crea/instala la App privada únicamente en el
   repositorio editorial de staging. Guardar su PEM en un archivo local privado;
   nunca pegarlo en el chat, commits, argumentos de proceso o logs.
3. Configurar secretos independientes en Worker y WordPress staging por stdin o
   archivo privado; desplegar el Worker con CODE_SHA igual al commit probado,
   CODE_BRANCH igual a la rama de integración, PAGES_ENVIRONMENT=preview.
4. Instalar en mu-plugins de staging únicamente los cuatro PHP de esta integración,
   mediante archivos temporales, hashes y permisos 644. Activación de la constante
   nueva solamente después de confirmar aislamiento y permitir HTTP saliente
   exclusivamente al Worker de staging. El plugin antiguo debe seguir OFF.
5. Instalar `.github/workflows/rebotica-staging.yml` en la rama por defecto del
   repositorio **privado**, configurar entornos y secretos separados. Verificar
   saldo Actions y presupuesto de gasto cero. Solo entonces habilitar Actions y
   `SALERO_REBOTICA_STAGING_READY=true`; fijar SALERO_CODE_SHA y URL del coordinador.
6. Prueba ficticia: borrador (ningún snapshot público), publicación, actualización
   y retirada. Comprobar generación/revisión/count/hash, una única promoción,
   HTML inicial del listado/artículo, filtros y 404 tras retirada. Limpiar a borrador.
7. Fallos aislados: conexión, timeout, upload/ACK GitHub perdido, snapshot incompleto,
   edición concurrente, reinicio DO, build fallido, build antiguo, ACK de Pages
   perdido. No considerar superada la prueba real con dobles o Miniflare.

## Recuperación y rollback

- Outbox/intent se reintentan con WP-Cron, backoff 15 s a 1 h e identidad estable.
  WP-Cron necesita tráfico; para recuperación garantizada debe verificarse un
  ejecutor de cron de staging disponible sin nueva cuota. No se ha creado ninguno.
- Un fallo de build previo a upload puede abortarse solo en fase building. Para
  reintentar, workflow_dispatch con nuevo job ID, mismo SHA y generación explícita;
  la autoridad DO vuelve a verificarla. Un build antiguo falla antes de promover.
- Un upload incierto exige reconciliar con el deployment real. Si no se puede
  demostrar el resultado terminal, mantener cerrado el permiso de publicación.
  No forzar success ni usar fallback antiguo. El monitor se puede reejecutar.
- Un fatal WordPress conserva un evento incompleto. Revisar el estado real de DB y
  reconciliar bajo lock antes de completar manualmente; no hay desbloqueo por TTL.
- No borrar SQLite ni commits usados por jobs/rollback. Retención inicial append-only;
  hace falta acordar mantenimiento cuando crezca el historial y conservar referencias.
- Desactivar la constante nueva, deshabilitar Actions y retirar solamente estos
  cuatro PHP de staging. Conservar journal/outbox para investigación. Mantener o
  restaurar el último Preview válido. No tocar archivos privados de producción,
  contenido real, DNS, MCP ni main. Nunca retroceder silenciosamente una publicación
  confirmada usando un snapshot anterior con una generación más alta inventada.

## Coste y límites

Cuenta Cloudflare verificada en Workers Free: 2 Workers antes de esta preparación;
DO existente 24,12 MB, sin operaciones DO mostradas para el día consultado. Workers
Free: 100.000 peticiones/día y 10 ms CPU/petición. DO SQLite Free: 100.000 peticiones,
13.000 GB-s, 5 millones de filas leídas y 100.000 escritas por día; 5 GB totales.
Al superar límites Free las operaciones fallan; no se habilita plan Paid/R2.
El CPU de firma/App y el consumo del ciclo completo todavía necesitan medición real.

GitHub Free incluye 2.000 minutos/mes y 500 MB de artefactos en repositorios privados.
Los jobs usan Linux, sin artefactos persistentes en Actions y timeout de 15/10 minutos;
estimación inicial 3–6 minutos/ciclo, pendiente de medición. El saldo real y el
presupuesto cero deben verificarse antes de habilitar Actions. No asegurar coste cero
fuera de esas cuotas. No se han contratado servicios ni habilitado facturación.

Referencias oficiales:
- https://developers.cloudflare.com/workers/platform/pricing/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event
