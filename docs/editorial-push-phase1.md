# Push editorial — Fase 1 local

Base: `origin/main` `8283cebe5db420ecb0e4671cc99b21badee2288b`.
Rama local: `codex/push-snapshots-phase1`. No se incluye la rama diagnóstica.

Esta fase añade bibliotecas independientes, fixtures y pruebas. No conecta el
pipeline existente, no instala el exportador como MU-plugin y no modifica Pages,
WordPress, HTML, CSS, SEO ni Nuestros menús. No contiene credenciales reales,
peticiones HTTP ni llamadas al Deploy Hook. No requiere paquetes npm/Composer nuevos.

## Qué demuestra y qué no

El exportador PHP 7.4 genera bytes completos y consistentes con dos lecturas de
las cuatro colecciones, tres comprobaciones de revisión, validación de páginas,
registros, fechas, estados públicos, duplicados, totales y hash SHA-256.
El adaptador WordPress utiliza `rest_do_request` y `response_to_data(..., true)`:
REST interno como usuario anónimo, contexto view, con restauración del usuario
incluso ante errores. Su integración se prueba con stubs locales; no se ejecuta
contra WordPress real ni prueba todavía los filtros de los plugins instalados.

El protocolo Node verifica esos mismos bytes producidos por PHP; no exige que PHP
y JavaScript vuelvan a serializar el contenido de forma idéntica. La firma HMAC
cubre hash, longitud, revisión, counts, generación, batch y versión. El manifiesto
se publica únicamente después de comprobar el objeto completo. No hay fallback.
La firma de transporte cubre operación, argumentos, rol, timestamp y nonce.
Roles editor/builder/monitor separados; replay, modificaciones y llamadas fuera
del rol se rechazan. Los nonces forman parte del estado reconstruible.

El coordinador es un modelo síncrono con almacenamiento inyectado. Checkpoints
JSON simulan reinicios, pero NO demuestran transacciones reales de Durable Objects,
atomicidad del almacenamiento de opciones de WordPress, autenticación HTTP,
concurrencia entre procesos PHP ni integración con la promoción de Pages.
La Fase 2 debe implementar esos adaptadores y probar sus interleavings reales.

## Estados y obligaciones del editor

- Sin snapshot: no hay autorización de publicación.
- Ventana editorial abierta: bloqueo durable remoto; se permite editar localmente.
- Exportación congelada: ningún nuevo guardado puede usar el permiso viejo.
- Snapshot ready: ventana cerrada, bytes verificados, revisión publicable.
- Building: una edición nueva confirmada invalida el build antiguo.
- Publishing: barrera final; nuevas ediciones esperan o reciben rechazo recuperable.
- Unknown: no se permite nuevo build/edición hasta reconciliar el resultado.
- Terminal success/failure: solo el monitor autorizado puede resolver el job;
  éxito exige identidad y recibo exactos; fallo conserva snapshot y pendientes.

Las transiciones que cierran la ventana local y publican el manifiesto requieren
orden durable: congelar primero el permiso en WordPress, exportar con ese estado,
subir y confirmar. Nunca reabrirlo sin reconciliar; de lo contrario un snapshot
podría aceptarse mientras el permiso offline aún permite mutaciones invisibles.
El manifiesto conserva el orden de los arrays, por tanto el orden de las tarjetas.

## ¿Puede guardarse mientras falla la sincronización?

**Sí, condicionalmente.** Si begin-edit quedó confirmado de forma durable antes
del fallo, el coordinador ya bloquea cualquier publicación antigua. Los editores
pueden seguir guardando en esa ventana, aunque las nuevas revisiones no lleguen.
El registro local sigue cada request, marca incompletos y agrupa cambios concurrentes.
Una vez congelada para exportar, la ventana no permite seguir guardando hasta
confirmar/reconciliar y obtener un nuevo permiso.

**No, si Cloudflare todavía desconoce la edición.** La prueba del contraejemplo
permite un guardado invisible deliberadamente y muestra que el coordinador puede
publicar la revisión anterior: no tiene información para distinguir ese caso.
Un heartbeat/TTL no elimina esa ventana; caducar un bloqueo tampoco es seguro.

Si se pierde la confirmación inicial, se conserva la intención y se consulta o
reintenta con la misma identidad. No se autoriza una mutación hasta confirmar.
Durante Publishing/Unknown no se conceden ventanas nuevas. El texto no guardado
debe conservarse como trabajo del editor, con UI recuperable en Fase 2; no se
implementa aquí esa interfaz ni una política real de borradores de WordPress.

Permitir siempre guardados offline requiere aceptar una garantía más débil o
introducir otro canal fiable de invalidación. No se propone esa relajación.

## Orden, identidad y recuperación

La generación remota crece al abrir una ventana. Un batch cerrado no puede volver
a abrirse; un paquete atrasado no puede avanzar el head. Los arrays y counts deben
estar completos. Una subida interrumpida o ACK perdido conserva head bloqueado;
repetir el objeto inmutable y confirmar es idempotente. Se vuelve a comprobar la
generación después de guardar el objeto y antes de publicar el head.

Solo hay un job activo. Una edición nueva durante Building invalida su promoción,
pero no autoriza otro job hasta saber que el anterior terminó. Publishing congela
nuevas ventanas hasta el estado terminal real. Unknown nunca se libera solo por
timeout. Un recibo no constituye por sí solo evidencia de promoción: el futuro
monitor debe consultar el deployment específico y validar environment/main/SHA,
job, generación, snapshotId, revisión, counts, tests y éxito.

Los jobs completados no se reejecutan. Se permite un commit de código nuevo usando
el mismo snapshot vigente, sin necesitar una edición ni fallback editorial.
El modelo no envía Hooks: en Fase 2, persistir la intención antes del POST,
reconciliar aceptación ambigua por API y no repetir un POST por timeout.
No se promete exactamente-una-vez del Hook sin soporte de idempotencia externo.

## Ejecutar localmente

Con Node 22.16.0 y un CLI PHP 7.4.33 disponible:

```sh
node scripts/test-push-phase1.mjs --php=/ruta/al/php-7.4.33
node scripts/test-editorial.mjs
```

El primer comando ejecuta exportador PHP y protocolo/coordinador Node, incluyendo
un snapshot producido por PHP y renderizado con los renderers existentes. No se
conecta a un WordPress real. El runner no se añade a postinstall/build/package.json.

Cobertura específica:

- HTTP 202/403/500, HTML, totales ausentes/incoherentes, cambios de paginación.
- Páginas truncadas, IDs/slugs duplicados, estados privados/protegidos, UTF-8 inválido.
- Edición activa, revisión cambiante y contenido cambiante con revisión aparentemente igual.
- Firma/hash/counts alterados, versión/formato inválidos, replay y roles incorrectos.
- Primera comunicación fallida y begin confirmado con ACK perdido.
- Guardados offline permitidos tras confirmación y crash con edición incompleta.
- Exportación antigua, subida fallida, subida completada con ACK perdido y objeto corrupto.
- Reintentos del mismo head/job, snapshots atrasados y carreras edición/promoción.
- Recibos/deployments inválidos, resultado desconocido, reinicio y conservación del bloqueo.
- Build nuevo después de fallo y rechazo de loops/despliegues regresivos.
- H1/title/canonical conservados al reutilizar los renderers de Home/matrices.

La suite anterior cubre sectorial, 78 comprobaciones de colecciones/middleware/schema,
fetch, casos, menús y 14 escenarios de editorial build. Las simulaciones anteriores
PHP del MU-plugin también se mantienen ON/OFF/unset/autosave/validación del Hook.
El warning Node existente MODULE_TYPELESS_PACKAGE_JSON no se corrige en esta fase.

## Medidas y dependencias para Fase 2

Los tiempos publicados por la simulación son benchmarks locales de Node para
fixtures pequeños y otro de tamaño cercano al snapshot actual. No prueban el
límite de CPU de Workers Free ni el rendimiento PHP dentro de SiteGround.

Dependencias futuras: Worker Free, Durable Object SQLite y R2 Standard privado;
separación de claves por rol/entorno, retención acotada y métricas de cuotas. No se
crean aquí ni se añaden dependencias de red. No se utiliza IP fija ni User-Agent falso.

Antes de activar deberán demostrarse:

1. Barrera ANTERIOR a todas las mutaciones soportadas (admin/REST/ACF/términos/medios/WP-CLI).
   Los hooks actuales de detección posteriores a mutación no bastan.
2. Permisos y outbox durables/atómicos bajo procesos PHP concurrentes; sin cerrar
   una ventana mientras sobrevivan editores autorizados a usarla.
3. Transacciones reales del coordinador y publicación del manifiesto tras R2 completo.
4. Exclusión real de publishers, incluidos Git/manual, y reconciliación específica
   del deployment hasta éxito/fallo; no solo un recibo o lease caducado.
5. Recuperación periódica local fiable. WP-Cron por visitas no garantiza progreso
   sin tráfico; valorar cron incluido en SiteGround, sin configurarlo ahora.
6. Adaptar consumidores individuales que aún consultan CMS para fijarlos al snapshot
   del deployment, conservando diseño, SEO, URLs y Nuestros menús.

Recomendación: continuar a Fase 2 de integración y pruebas AISLADAS, no activar
producción. Los invariantes locales son viables, pero las garantías operativas
seguirán pendientes hasta demostrar los seis puntos anteriores.

## Rollback

En esta fase basta con retirar los nueve archivos nuevos o abandonar la rama local:
no hay instalación ni cambios de ejecución que desactivar. Mantener main, Build
command vacío y SALERO_PAGES_ENABLED=false. No borrar snapshots/eventos reales.
En una futura activación: OFF, detener nuevas publicaciones, conservar deployment
válido y cola, reconciliar jobs desconocidos y solo entonces recuperar configuración.

## Resultado de la ejecución local

Con Node 22.16.0 y PHP 7.4.33:

| Suite | Resultado |
|---|---|
| Exportador nuevo | PASS — 38 comprobaciones |
| Coordinador/protocolo nuevo | PASS — 62 escenarios |
| Sectorial existente | PASS |
| Colecciones/middleware/schema existentes | PASS — 78 comprobaciones |
| Fetch JSON existente | PASS |
| Casos existentes | PASS |
| Menús existentes | PASS |
| Editorial build existente | PASS — 14 escenarios |
| MU-plugin ON existente | PASS — 26 comprobaciones |
| MU-plugin OFF y constante ausente | PASS — 36 cada uno |
| Autosave ON/OFF | PASS |
| URL Hook existente | PASS — 17 casos |

Fixture PHP: 3.923 bytes. Fixture representativo: 179.703 bytes. La medición local
observada para firma/verificación de este último fue aproximadamente 0,20 ms de
mediana y 0,31 ms p95 (100 iteraciones). No extrapolar a Workers Free sin medirlo allí.
No se leyó contenido real del CMS ni se escribió fuera de los archivos locales
nuevos en esta Fase 1. Los resultados no constituyen activación ni deployment.
