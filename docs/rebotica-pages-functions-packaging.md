# Diagnóstico local del empaquetado Pages Functions

Referencia: código `0812bd1ccbad7b42b676ff753016d0957f6eafa9`, ejecución
`37955506227`, deployment fallido `6066d6c1-e89a-4ce7-b441-dba7d672ffff`.

## Causa demostrada

El circuito no crea ni envía un ZIP. El builder transfiere archivos por partes al
promotor, que crea una solicitud `multipart/form-data` a Pages.

`scripts/build-broker-staging.mjs` ejecuta `wrangler pages functions build` con
`--outfile .../_worker.js`. En Wrangler 4.148.0 ese archivo es un contenedor MIME,
independientemente de su extensión. Contiene `metadata` con `main_module` y el
módulo `functionsWorker-….js`, de tipo `application/javascript+module`.

El promotor enviaba esos bytes en el campo `_worker.js`, reservado a JavaScript
plano. Pages los interpretaba como `worker.mjs`; el comienzo
`------formdata-undici-…` es una sucesión inválida de operadores de decremento.
Node 22.16.0 reproduce exactamente:

```
SyntaxError: Invalid left-hand side expression in prefix operation
```

El JavaScript **dentro** del contenedor tiene sintaxis válida. No hay HTML ni una
expresión incorrecta en el código fuente de las Functions. El error está en la
identificación del formato de transporte, no en los renderers.

Cloudflare documenta campos mutuamente excluyentes: `_worker.js` para JavaScript
y `_worker.bundle` para el contenedor multipart:
https://developers.cloudflare.com/api/resources/pages/subresources/projects/subresources/deployments/methods/create/

## Corrección mínima

- El promotor identifica el contenedor, recupera su boundary y lo adjunta como
  `_worker.bundle` con el tipo MIME correspondiente. Conserva los bytes intactos.
- El nombre interno `_worker.js` y el contrato de archivos del coordinador se
  mantienen para no cambiar identidad, manifiestos ni almacenamiento durable.
- El builder valida la representación final y la sintaxis de todos sus módulos
  JavaScript antes de atestar/subir el artefacto. Un bundle truncado, HTML,
  metadata inválida o sintaxis incorrecta aborta el build.
- No se cambian Functions, contenido editorial, renderers, Nuestros menús,
  configuración remota, secretos ni estado de la generación 1.

## Prueba reproducible sin publicaciones

```
node tests/editorial-pages-functions-packaging.mjs
node scripts/test-rebotica-editorial.mjs
```

La prueba compila las Functions reales con el mismo comando del builder,
reproduce el error anterior, serializa y vuelve a leer la solicitud final a Pages
con un cliente simulado, verifica igualdad byte a byte y arranca el módulo real
en Miniflare/workerd. Las conexiones externas del runtime están prohibidas.
También rechaza un módulo secundario inválido, HTML, contenedores truncados,
boundaries inválidos y un entrypoint ausente; conserva compatibilidad con JS plano.

Se reprodujo asimismo el sitio completo localmente desde el paquete original de
generación 1 (HMAC y SHA-256 verificados), con los recuentos 4/3/2/2. El snapshot
permanece en `1edae8b2a43910ee25d931cc752425ced209e5e2`, con SHA-256
`4018dce46674a3c5c64c63599481b2310430fa6d97591b2329ed0fabfb798d64`.
El empaquetado corregido no altera HTML ni recibos. El hash del artefacto de una
futura ejecución debe calcularse nuevamente: boundary y nombre del módulo son
generados por Wrangler; no se reutiliza el digest del deployment fallido.

Resultados locales: 8 pruebas nuevas de empaquetado PASS; suite editorial completa
PASS (incluye sectorial, colecciones SSG 78, fetch, casos, menús y simulaciones
editoriales); coordinador en workerd 38 PASS; promotor SQLite 9 PASS.
No se añadieron dependencias. Se utilizó Node 22.16.0 y Wrangler 4.148.0.

## Condiciones para otra prueba controlada

No basta con repetir `notify` ni reiniciar Actions. La notificación original ya
está marcada como enviada y el job tiene un resultado terminal `failure`.
`claim` rechaza ese identificador con `job_completed`.

Antes de otra ejecución es necesaria una recuperación explícita, separadamente
aprobada y probada, con un identificador de intento nuevo para el **mismo**
snapshot y generación. Debe conservar el job/deployment fallidos como historial,
comprobar que no existe una publicación exitosa o ambigua, y autorizar una única
creación de deployment por intento. No se borra SQLite ni se crea generación 2.
Ese mecanismo no se implementa en esta corrección de formato.

Después de aprobar esa recuperación: publicar únicamente el código revisado,
actualizar los anclajes inmutables y OIDC al nuevo SHA, alinear los componentes de
staging, releer el journal y ejecutar una sola prueba autorizada. Validar recibo,
HTML y SEO; cerrar Actions/promotor/accesos temporales tanto en éxito como fallo.
Producción permanece excluida durante todo el procedimiento.
