# Plantilla del repositorio editorial privado

Repositorio privado de staging preparado en `EugenioAtencia/salero-editorial-snapshots-staging`.
Estos archivos describen su configuración y los pasos pendientes. No copiar el código
web ni credenciales en él. Actions permanece deshabilitado hasta instalar y validar el workflow de staging,
los entornos separados y los secretos. Sin LFS, GitHub Pages o integración Git de
Cloudflare Pages. No conectar esta rama al proyecto de producción.

La rama `snapshots` ya está inicializada con un README y un commit verificable.
El adaptador requiere ese commit inicial; no crea repositorios ni ramas.
Contenido futuro:

- `snapshots/<sha256>.json`: bytes completos del snapshot canónico; máximo 1 MiB.
- `manifests/<generation>-<batch>.json`: identidad, firma HMAC, counts, hash y bytes.

SQLite mantiene commit/tree/blob/manifest/hash por generación. El build nunca
consulta `HEAD`, un `latest.json` mutable ni una rama para elegir contenido.
La referencia `snapshots` solo avanza sin force. Los commits son direcciones
inmutables por contenido, no una garantía de retención frente a administradores.
Nunca borrar commits usados por trabajos activos, publicaciones o rollback.

Retención inicial append-only. Registrar tamaño y tasa de crecimiento. Cuando
sea necesario limpiar, acordar una operación de mantenimiento independiente:
archivar generaciones autorizadas, fijar referencias retenidas, comprobar
recuperación, y reconciliar SQLite antes de eliminar. Borrar archivos en un
nuevo commit no elimina su historial ni garantiza liberar almacenamiento.

El workflow `.github/workflows/rebotica-staging.yml` se instala en este repositorio,
no en `main` de la web. El coordinador envía `repository_dispatch` únicamente después de confirmar el manifiesto
en SQLite. El outbox conserva la notificación hasta recibir ACK. No hay build en el evento
push del commit. La App puede emitir repository_dispatch con Contents write, sin Actions write.
La variable `SALERO_REBOTICA_STAGING_READY` debe permanecer ausente/false hasta validar
WordPress aislado, App y tokens. El build lee únicamente el locator autorizado por DO.
