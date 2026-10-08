# Plantilla del repositorio editorial privado

No es un repositorio creado. Estos archivos describen la configuración a verificar
antes de crear un repositorio independiente del código web. No copiar el código
web ni credenciales en él. Sin Actions, LFS, GitHub Pages o integración Git de
Cloudflare Pages. No conectar esta rama al proyecto de producción.

Inicializar la rama `snapshots` con este README y un commit real verificable.
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
