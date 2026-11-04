# La Rebotica — publicación en producción

## Único circuito

WordPress origen: https://cms.webagencia360.com. Destino público: https://agenciaconsalero.es, Pages `salerodigital`, rama `main`. Tras verificar los hashes, el middleware conserva la navegación, tipografía, consentimiento y analítica existentes. La Rebotica sirve HTML certificado del snapshot (artículos, listado, paginación, sitemap); no consulta WordPress en tiempo de petición. Casos, servicios, formularios y páginas comerciales conservan sus componentes existentes.

Se reutilizan los dos Workers existentes, sus credenciales y el repositorio privado `EugenioAtencia/salero-editorial-snapshots-staging`. Sus nombres conservan el sufijo histórico staging; el perfil de ejecución de producción limita explícitamente proyecto, rama, origen, OIDC y entorno Pages. No se crea otra infraestructura. El journal y los objetos `salero-production-editorial` / `production-only` son independientes de los de staging. Staging queda desactivado; sus evidencias y generación 2 se conservan.

Las publicaciones provienen exclusivamente del WordPress de producción. Se rechazan el marcador RB-326-20261104, referencias staging y registros con otro origen. Los snapshots quedan versionados e inmutables en Git privado. Actions ejecuta el builder y el monitor fijados a un SHA, sin recibir credenciales duraderas. El promotor mantiene el registro persistente previo al POST no idempotente de Pages y no repite despliegues con resultado incierto.

Pages no despliega automáticamente al hacer push a main: evitaría el contrato de snapshot y duplicaría el publicador. El único evento de producción es `salero-rebotica-production`; el evento de staging y READY staging permanecen cerrados.

## Publicar el próximo artículo

1. Crear o editar el artículo en el WordPress de producción, con su imagen, extracto y taxonomías. Publicar/actualizar normalmente; no usar staging.
2. Los hooks reservan un único lote antes de la escritura. El journal agrupa cambios, el cron exporta dos lecturas completas coherentes de posts y envía el snapshot firmado. No hay que hacer push ni crear un despliegue manual.
3. El dispatcher privado inicia Actions; el builder usa exclusivamente el snapshot, genera el HTML y empaqueta las Functions; el promotor publica una sola vez en Pages producción. El monitor confirma el deployment y cierra el trabajo.
4. Verificar la URL pública, HTTP 200, HTML inicial, canonical y BlogPosting. Si el trabajo queda pendiente o incierto, revisar ese mismo job antes de cualquier reintento. No generar otra publicación para ocultar un fallo.

Configuración privada de WordPress fuera de `public_html`: `salero-rebotica-production-private.php`. El loader MU `000-salero-rebotica-production-config.php` solo carga esa ruta local. `SALERO_REBOTICA_PRODUCTION_ENABLED=true` habilita el circuito de posts; el publicador legado `SALERO_PAGES_ENABLED` permanece false. No modificar sus credenciales ni activar el legado.

El cron de producción ejecuta wp-cron.php con PHP; no genera contenido ni modifica artículos. Los journals usan `salero_rebotica_production_journal`. No borrar opciones, outbox, snapshots ni logs para resolver un bloqueo.

## Reversión

Versión pública anterior a la migración: SHA `7ed1b203d7c908223a1450ca716933cc2cb2d60f`, deployment `edbe3fa0-2a5c-4301-86ef-c5c97f8ebf5f`. Se conservan la configuración y HTML previos en evidencias privadas.

Ante una regresión pública, cerrar READY producción y el promotor, pausar el cron editorial y deshabilitar el flag de producción sin borrar su journal. Revertir Pages al deployment anterior mediante rollback. No regenerar el snapshot ni volver a desplegar para simular la reversión. Mantener desactivado el despliegue Git automático hasta decidir expresamente cómo continuar.

El código sigue admitiendo despliegues legados sin receipt para rollback; un despliegue coordinado jamás recurre a WordPress ni a páginas antiguas si falta una certificación: responde 404 o 503 según corresponda.
