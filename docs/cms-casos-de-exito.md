# CMS de casos de éxito de Salero Digital

Este documento define la estructura de campos recomendada para el CPT `casos-exito` de WordPress. El objetivo es alimentar la página `/casos-de-exito/`, el carrusel visual y las futuras páginas individuales de cada caso.

## Criterio general

La ficha debe priorizar el contenido visual:

1. Si hay vídeo principal, se muestra el vídeo.
2. Si hay vídeo y poster, el poster se usa como imagen de carga.
3. Si no hay vídeo, se muestra la imagen principal.
4. Si no hay imagen principal, el frontend mantiene un fallback visual automático.
5. El logotipo es opcional. Si existe, aparece. Si no existe, no se muestra ningún bloque de logo.

## CPT recomendado

Nombre: Casos de éxito

Slug del CPT: `casos-exito`

Ruta frontend prevista: `/casos-de-exito/{slug}/`

Endpoint esperado por el frontend: `casos-exito`

## Grupo 1. Datos principales de la ficha

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Obligatorio | Uso |
| --- | --- | --- | --- | --- |
| Nombre del cliente o proyecto | `cliente_nombre` | Texto | Sí | Nombre interno o comercial del caso |
| Etiqueta visual | `visual_label` | Texto | Sí | Texto grande de la ficha visual, por ejemplo “Retail local” |
| Sector | `sector` | Texto | Sí | Sector visible en ficha y página individual |
| Servicio principal | `servicio_principal` | Texto | Sí | Servicio destacado en la ficha |
| Qué demuestra | `dato_destacado` | Texto | Sí | Prueba estratégica o valor del caso |
| Resumen corto | `descripcion_corta` | Área de texto | Sí | Texto breve para carrusel y tarjetas |
| Orden de aparición | `orden` | Número | Sí | Orden manual del carrusel |
| Caso destacado | `caso_destacado` | Verdadero o falso | No | Preparado para futuras secciones destacadas |

## Grupo 2. Medio principal

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Obligatorio | Uso |
| --- | --- | --- | --- | --- |
| Vídeo principal | `video_principal` | Archivo | No | Vídeo protagonista de la ficha |
| URL de vídeo externo | `video_principal_url` | URL | No | Alternativa si el vídeo está fuera de la biblioteca |
| Imagen poster del vídeo | `video_poster` | Imagen | Recomendado si hay vídeo | Imagen de carga del vídeo |
| Imagen principal | `imagen_principal` | Imagen | Sí si no hay vídeo | Imagen de respaldo |
| Texto alternativo de la imagen | `imagen_principal_alt` | Texto | Recomendado | Accesibilidad y SEO |
| Logotipo del cliente | `logo_cliente` | Imagen | No | Logotipo opcional del caso |

## Grupo 3. Galería del caso

Campo principal: `galeria_caso`

Tipo ACF: Repeater

Subcampos:

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Uso |
| --- | --- | --- | --- |
| Tipo de medio | `tipo_medio` | Selección | Imagen, vídeo o URL externa |
| Imagen | `imagen` | Imagen | Capturas, creatividades, mockups o campaña |
| Vídeo | `video` | Archivo | Reels, spots, clips, animaciones o demostraciones |
| URL externa | `url_externa` | URL | YouTube, Vimeo, Drive o recurso externo |
| Título del recurso | `titulo` | Texto | Título breve del recurso |
| Descripción | `descripcion` | Área de texto | Contexto del recurso |
| Texto alternativo | `alt` | Texto | Accesibilidad en imágenes |

Opciones recomendadas para `tipo_medio`:

- `imagen`
- `video`
- `url`

## Grupo 4. Contenido ampliado del caso

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Obligatorio | Uso |
| --- | --- | --- | --- | --- |
| El reto | `reto` | WYSIWYG | Sí | Situación inicial del cliente |
| La receta aplicada | `solucion` | WYSIWYG | Sí | Qué se hizo y por qué |
| Resultado | `resultado` | WYSIWYG | Sí | Qué se consiguió |
| Qué demuestra este caso | `aprendizaje` | WYSIWYG | No | Lectura estratégica del caso |
| Servicios trabajados | `servicios_trabajados` | Casillas | No | Web, SEO, Ads, contenido, redes, email, automatización, analítica |
| Herramientas usadas | `herramientas` | Repeater o área de texto | No | WordPress, Meta Ads, Google Ads, Mailchimp, Cloudflare, etc. |

## Grupo 5. Métricas

Campo principal: `metricas`

Tipo ACF: Repeater

Subcampos:

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Ejemplo |
| --- | --- | --- | --- |
| Métrica | `metrica` | Texto | Incremento de ventas |
| Valor | `valor` | Texto | 60 por ciento |
| Descripción | `descripcion` | Texto | Durante campaña de Navidad |

Este grupo debe usarse solo cuando haya datos contrastados o autorizados.

## Grupo 6. CTA

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Uso |
| --- | --- | --- | --- |
| Texto del CTA | `cta_texto` | Texto | “Quiero una estrategia parecida” |
| Enlace del CTA | `cta_url` | URL | Página de contacto o WhatsApp |
| Texto secundario | `cta_secundario` | Texto | Refuerzo comercial del bloque final |

## Grupo 7. SEO

| Etiqueta en WordPress | Nombre técnico | Tipo ACF | Uso |
| --- | --- | --- | --- |
| Título SEO | `seo_title` | Texto | Title personalizado |
| Meta descripción | `seo_description` | Área de texto | Descripción SEO |
| Imagen social | `seo_image` | Imagen | Imagen para compartir |
| Canonical | `canonical_url` | URL | Solo si fuera necesario |

## Campos mínimos para publicar una ficha

Para que el carrusel funcione correctamente, cada caso debería tener como mínimo:

- `cliente_nombre`
- `visual_label`
- `sector`
- `servicio_principal`
- `dato_destacado`
- `descripcion_corta`
- `orden`
- `video_principal` o `imagen_principal`
- `video_poster`, si hay vídeo
- `logo_cliente`, solo si se dispone de él

## Mapeo actual del frontend

El archivo `/assets/js/casos-de-exito.js` ya busca estos campos:

Vídeo:

- `video_principal`
- `video_principal_url`
- `video_caso`
- `video_campana`
- `video`

Poster:

- `video_poster`
- `poster_video`
- `poster`
- `imagen_principal`
- `imagen_caso`
- imagen destacada de WordPress

Imagen:

- `imagen_caso`
- `imagen_principal`
- `imagen_destacada`
- `imagen_campana`
- `captura_campana`
- `hero_image`
- `cover_image`
- imagen destacada de WordPress

Logo:

- `logo_cliente`
- `logo_marca`
- `logo`

Contenido:

- `sector`
- `sector_cliente`
- `tipo_de_cliente`
- `servicio_principal`
- `servicios`
- `servicio`
- `resultado`
- `dato_destacado`
- `mejora_conseguida`
- `resumen`
- `resumen_del_reto`
- `descripcion_corta`
- `descripcion`
