# Diagnóstico GitHub App de staging — 2026-10-09

## Evidencia y límites

- El primer intento remoto abrió la generación 1 y falló en `offer` con `github_authentication`, antes de obtener el token de instalación. No hubo notification, Actions ni deployment editorial.
- El código anterior agrupaba excepción de fetch, HTTP distinto de 201, HTML y token inválido bajo el mismo error. No se registró HTTP ni request ID: no es posible recuperar la causa exacta a partir de esa respuesta.
- Lectura firmada desde el Mac: GET `/app/installations/169496401`, HTTP 200; App ID 5246903, propietario EugenioAtencia, selección de repositorios `selected`, Contents write / Metadata read. Diferencia respecto a la cabecera Date: menos de un segundo. No se emitió un installation token en esta comprobación.
- `wrangler secret list` confirma los tres bindings GitHub en el coordinador y la ausencia de EDITOR_KEY. No permite inspeccionar ni demostrar el formato/valor de la clave remota, ni comprobar el reloj del Worker.
- RS256, iat=now−60, exp=now+540 e iss=App ID son correctos. Firma y formatos PKCS1/PKCS8/CRLF se verifican con claves efímeras locales, en Node 22.16.0 y workerd.

## Cambios locales

Se añade el User-Agent real `Salero-Editorial-Staging` a las solicitudes GitHub: GitHub exige identificar la aplicación. Se mantienen endpoint fijo, permisos limitados, timeout, rechazo de redirects/HTML y límites de respuesta. Esta omisión es un defecto confirmado del contrato HTTP; su responsabilidad en el incidente remoto queda por confirmar.

La autenticación distingue configuración, firma RSA, 401/403/404/422/429/5xx, red, timeout, error interno, HTML, JSON inválido y token inválido. Los diagnósticos solo contienen categoría, duración, HTTP, request ID filtrado y diferencia de reloj. Nunca contienen exceptions/messages, respuesta, JWT, PEM ni token. El callback está desactivado por defecto; en Worker requiere ENVIRONMENT=staging y GITHUB_AUTH_DIAGNOSTICS=true. No se ha habilitado remotamente.

## Operación remota pendiente de autorización

Para confirmar la causa desde Cloudflare hace falta autorizar una versión temporal de diagnóstico del coordinador, manteniendo Actions deshabilitado, promotor OFF y EDITOR_KEY ausente. La invocación debe usar autorización diagnóstica separada, limitada a una llamada, sin ejecutar begin/offer/notify ni acceder a estados editoriales.

La única llamada autenticada a GitHub propuesta es POST `https://api.github.com/app/installations/169496401/access_tokens`, con repositorio `salero-editorial-snapshots-staging` y Contents write. Generar el JWT solo en memoria, validar 201/JSON/permissions/expiry y descartar el token sin devolverlo ni persistirlo. Emitir solo diagnóstico saneado y retirar el acceso diagnóstico al terminar. Esta operación crea una credencial temporal de instalación, pero no crea snapshots, commits, workflows ni deployments Pages. No se ha ejecutado.

## Generación 1

No borrar/resetear SQLite. El modelo conserva permiso e intención pendientes después del fallo: la edición sigue abierta y ningún snapshot fue autorizado. Debe inspeccionarse el journal de forma controlada antes de recuperar. Una recuperación autorizada reutilizará exactamente batchId, generación y hash del paquete original; jamás notificará una intención no confirmada ni limpiará estados para saltarse los fences. Antes de otra prueba completa, alinear el nuevo commit autorizado en coordinador, promotor OIDC y dispatcher fijado; demostrar autenticación y cerrar el diagnóstico temporal.

## Estado conservado

Solo cambios locales en codex/rebotica-editorial-staging. Sin push, merge, nueva prueba completa, instalación WordPress, cambios de secretos o despliegues remotos. Actions deshabilitado; promotor OFF; EDITOR_KEY ausente. Producción permanece en 837db72f99312bcf68c0739a6d4cf6ec718ab521.

Referencias: https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api#user-agent-required y https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app
