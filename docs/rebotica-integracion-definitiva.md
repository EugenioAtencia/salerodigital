# Integración editorial definitiva — 4 noviembre 2026

Base: main 7ed1b203d7c908223a1450ca716933cc2cb2d60f. Se reutiliza el código de d4a5825 y el snapshot firmado de generación 2, commit privado cc22ad6d7a50cf2350eebb96d6d973f9f8d9aef6. No se modifica el contenido ni se genera otra publicación editorial.

## Corrección de cabecera

El adaptador snapshot sustituía la primera aparición de `<span>Salero Digital</span>` por ese texto seguido de etiquetas. La primera coincidencia pertenecía al logotipo, no al autor. El HTML era incorrecto antes de empaquetarlo: no era un fallo de carga de CSS ni de Cloudflare. Se elimina la sustitución y la plantilla compartida renderiza las etiquetas en una lista semántica dentro del resumen del artículo, con estilos flexibles para móvil. El encabezado global queda intacto. Prueba de regresión con etiquetas visibles y ausentes del header.

## Lecturas de WordPress en main

| Ruta/componente | Comportamiento actual | Sustitución preparada |
| --- | --- | --- |
| Artículos `/la-rebotica/{slug}/`, middleware + blog-renderer | REST posts por slug, anterior, siguiente y relacionados | HTML certificado y navegación del snapshot completo |
| Listado y `/la-rebotica/page/{n}/`, blog-index-renderer | fetchPublishedBlogPosts pagina REST posts | Listado, datos embebidos y paginación locales del mismo snapshot |
| sitemap.xml, sitemap-renderer | REST posts y casos-exito en cada generación de respuesta | Sitemap certificado del artefacto: sustituye URLs editoriales y conserva las restantes del checkout |
| blog.js | Con datos salero-blog-data usa datos embebidos y páginas HTML locales; sin ellos conserva fallback REST | Los artefactos coordinados siempre llevan datos embebidos, sin cliente REST ni segundo origen editorial |
| blog-article.js / blog-article-client.js / blog-renderer-static.js | Código alternativo/antiguo con transporte REST | No se incluye como renderizador en artículos del snapshot; no constituye otro circuito activo |
| Casos individuales, caso-renderer-v4 | Consultas CMS REST/AJAX, embeds y media | Permanece fuera de La Rebotica; no se migra su contenido en esta entrega |
| Sectores, Function [slug].js y plantilla [slug]/index.js + detail.js | Ruta con static-first y fallback REST; plantilla alternativa usa cliente getBySlug | Se conserva; no es contenido editorial de posts |
| Home, servicios/sectores/casos listados, home.js/collection.js/casos-de-exito.js | data-ssg=collections evita consultas de listado en las páginas existentes; fallback CMS si falta ese marcado | Se conserva su HTML actual |
| Servicios individuales, service-renderer | Plantillas locales; medios con URL del CMS no equivalen a consultas REST | Sin cambios |

## Arquitectura preparada

WordPress edita; el exportador entrega un snapshot inmutable; el coordinador, Actions y promotor ya validados certifican y publican un único artefacto Pages. Pages sirve ese artefacto, sin leer WordPress para La Rebotica. No hay R2, otro coordinador ni una segunda sincronización.

El middleware compartido selecciona el contrato `snapshot-coordinated` mediante salero-build.json y verifica hashes de artículos, listado, paginación y sitemap. Si una página fue retirada devuelve 404; si la certificación es inválida devuelve 503, nunca contenido del CMS ni de un snapshot anterior. Sin contrato coordinado permanece el comportamiento del despliegue legado para rollback. Son modos de despliegue excluyentes, no dos fuentes simultáneas. La política staging añade únicamente origen, noindex y retirada de analítica; no implementa otra ruta editorial.

Se conservan renderizadores SEO actuales, FAQ, índice, relacionados, títulos especiales, schema, estilos responsive y páginas comerciales de main. El sitemap no editorial se toma del checkout. Se comparó con producción (HTTP 200) y se incorporaron las dos URLs de casos publicadas que faltaban en el XML local: muebles-sarria y enoro; se conserva también muebles-sarria-captacion-leads-automatizacion. Así no desaparecen al sustituir el sitemap dinámico.

## Estado y activación pendiente

Esta rama no cambia main, WordPress ni las políticas de seguridad staging. Coordinador/promotor/dispatcher permanecen vinculados al SHA d4a5825 y cerrados. La corrección visual se publica como despliegue de código de staging reutilizando generación 2, sin actualizar journals ni anunciar otro trabajo editorial.

Pendiente una promoción controlada expresamente autorizada a producción: revisión/merge y despliegue del contrato estático con snapshot de WordPress de producción, inventario de sitemap certificado y políticas de repositorio/proyecto/dominio/SHAs de producción configuradas en los componentes existentes. No basta con activar un flag staging; esas políticas siguen deliberadamente limitadas a staging y no se han relajado. El marcador de prueba y el snapshot staging nunca deben promoverse como contenido de producción.

Validación dirigida: rebotica-snapshot-simulation, editorial-delivery-simulation, editorial-staging-preview-simulation; comprobación del artefacto real y escritorio/móvil en staging. No se repite la prueba automática completa.
