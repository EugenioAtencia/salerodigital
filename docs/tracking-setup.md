# Configuracion de seguimiento para Salero Digital

## Objetivo

Esta web se sirve desde Cloudflare Pages, no desde WordPress. Por tanto, los codigos de seguimiento no deben instalarse como plugin de WordPress, sino en la capa de Cloudflare o en Google Tag Manager.

La recomendacion operativa es:

1. Usar Cloudflare Pages Functions para insertar la verificacion de Search Console y el contenedor de Google Tag Manager.
2. Usar Google Tag Manager para gestionar GA4, Google Ads, Meta Pixel, eventos de conversion y etiquetas futuras.
3. No insertar Meta Pixel, GA4 y Google Ads directamente en todas las plantillas para evitar duplicidades y problemas de consentimiento.

## Variables previstas en Cloudflare Pages

Crear estas variables en Cloudflare Pages, dentro de Settings, Environment variables:

```text
SALERO_TRACKING_ENABLED=1
SALERO_GTM_ID=GTM-XXXXXXX
SALERO_GSC_VERIFICATION=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Opcionalmente, para desactivar todo el sistema sin tocar codigo:

```text
SALERO_TRACKING_ENABLED=0
```

## Que debe cargar el middleware

Cuando SALERO_TRACKING_ENABLED sea 1:

- Si existe SALERO_GSC_VERIFICATION, insertar en head una meta etiqueta de verificacion de Search Console.
- Si existe SALERO_GTM_ID, insertar el contenedor de Google Tag Manager en head.
- Si existe SALERO_GTM_ID, insertar el bloque noscript de Google Tag Manager justo despues de la apertura de body.

## Gestion recomendada dentro de Google Tag Manager

Dentro de GTM deben configurarse:

- GA4.
- Google Ads.
- Meta Pixel.
- Conversiones.
- Click en WhatsApp.
- Click en llamadas a la accion.
- Envio de formulario.
- Pagina de gracias.
- Scroll y engagement si procede.

## Consentimiento

Para cumplir correctamente con la medicion en Espana y Europa, las etiquetas de analitica avanzada, publicidad y remarketing deben condicionarse a consentimiento.

Se recomienda usar una CMP o banner de cookies compatible con Consent Mode, y disparar las etiquetas en GTM segun el estado de consentimiento.

## Rutas que debe cubrir

El sistema debe actuar sobre todo HTML publico:

```text
/
/el-menu/
/el-menu/:slug/
/nuestros-menus/
/nuestros-menus/:slug/
/sectores/
/sectores/:slug/
/casos-de-exito/
/casos-de-exito/:slug/
/la-rebotica/
/la-rebotica/:slug/
/hablamos/
/hablamos/gracias/
/la-receta/
```

## Nota tecnica

El middleware actual ya existe en:

```text
functions/_middleware.js
```

Ese archivo ya se usa para inyectar Schema en paginas generales. La integracion de tracking debe hacerse en el mismo punto para mantener una unica capa de modificacion del HTML final.
