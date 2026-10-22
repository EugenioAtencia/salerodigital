# Propuesta SEO, estados HTTP y sincronización editorial

Preparada el 22 de octubre de 2026 en `EugenioAtencia/salerodigital`.
Rama local: `codex/propuesta-seo-http-editorial`.
Base: `0dd128c`, checkout existente `codex/github-snapshot-integration` (12 commits por delante del `main` local). Esta propuesta se revisa como diff contra esa base; para llevarla a main hay que reconciliar primero las dependencias de snapshots ya presentes en el checkout.

No se ha hecho push, merge, despliegue, activación de hooks ni escritura en WordPress. Los cambios de contenido son archivos locales generados desde lecturas públicas del CMS.

## Cambios propuestos

- Añadir `404.html` raíz para desactivar la respuesta SPA por defecto en rutas inexistentes de Cloudflare Pages. Quitar la reescritura `/el-menu/* … 200`, de modo que las Functions de servicios puedan responder 404.
- Comprobar con WordPress la existencia y estado público del artículo antes de devolver su shell. Colección vacía: 404; error de red, timeout, respuesta HTML, JSON inválido o registro incoherente: 503. Se conservan los slugs válidos, incluidos los codificados, sin convertir una dirección inválida en otra válida.
- Cambiar el fallback temporal de casos a 503 si el CMS no permite confirmar su existencia. Conservar su contenido de recuperación y diagnóstico. El middleware devuelve los errores sin inyectarles schema ni canónicas de páginas válidas.
- Sustituir `HomePage` y `ServicePage` por `WebPage`. Usar el dominio canónico `https://agenciaconsalero.es` desde el generador compartido.
- Renderizar el schema de los cuatro servicios con el mismo generador que usa el middleware: un solo `salero-schema-graph`, con Organization, WebSite, WebPage, Service y BreadcrumbList. WebPage enlaza al Service y este a la organización mediante sus `@id`. El adaptador de snapshots reutiliza ese generador.
- Actualizar el listado y el ItemList de La Rebotica con la misma colección validada de WordPress, con canonical de producción en cada página.
- Generar sitemap junto a las colecciones: conservar las 15 URLs estáticas existentes y añadir exclusivamente los casos y artículos publicados, además de las páginas de paginación que correspondan. Los detalles utilizan el slug del CMS, también si es numérico; no se sustituyen por alias derivados del título.

## Evidencia editorial

El conector Salero WordPress identifica `agencia-con-salero` con frontend `https://agenciaconsalero.es` y REST `https://cms.webagencia360.com`.
Consulta autenticada de artículos publicados: tres registros. La generación REST pública, con paginación y totales validados, confirma cuatro servicios, tres sectores, dos casos y tres artículos.

| Tipo | ID | Slug |
| --- | --- | --- |
| Artículo | 326 | seo-moron-de-la-frontera |
| Artículo | 223 | guia-completa-sobre-gestion-de-redes-sociales-para-negocios-locales |
| Artículo | 43 | marketing-digital-para-negocios-locales |
| Caso | 166 | muebles-sarria |
| Caso | 157 | enoro |

Hash SHA-256 de las cuatro colecciones completas, confirmado por dos lecturas consecutivas:
`9f93b7257ec0e43836045aed13be39da63f2933280f6e6f74dabbf2d013a2de0`.
Las tres modificaciones editoriales de artículos consultadas son del 21 de octubre de 2026, entre 18:18:19 y 18:18:34 UTC.

El sitemap resultante contiene 20 URLs. Fundación ONCE y Gestamp no figuran entre los casos publicados en esta lectura; no se añaden al sitemap. Se conservan sus rutas y la compatibilidad del código existente. Cuando el caso 140 esté publicado, el generador incluye `/casos-de-exito/140/`, su URL canónica, en lugar del alias `gestamp-digital-summit`.

## Verificaciones reproducibles

```sh
npm test
node tests/editorial-snapshot-pages-simulation.mjs
node tests/editorial-push-simulation.mjs
npm run check:editorial
```

`npm test` incorpora `tests/seo-editorial-simulation.mjs`: 26 comprobaciones de estados de artículos, fallos CMS, slugs inválidos, grafo único en servicios, relaciones `@id`, ausencia de schema en errores, contenido editorial, sitemap canónico y detección de desincronización. Un cambio concurrente o un registro draft impide escribir nuevos resultados. Las simulaciones existentes comprueban también paginación, duplicados, limpieza de páginas antiguas y conservación del HTML cuando el CMS falla.

`npm run check:editorial` consulta el CMS dos veces, valida las colecciones y compara exactamente La Rebotica y el sitemap con lo que se generaría. Falla si hay diferencias o cambia el CMS entre lecturas. No escribe archivos. `npm run sync:editorial` actualiza únicamente esos archivos locales y elimina paginaciones SSG sobrantes; no ejecuta ningún despliegue. Esto es una comprobación ejecutable, no una nueva automatización programada.

Prueba HTTP real con Wrangler Pages local, usando una copia temporal de los archivos públicos y Functions, sin credenciales ni dependencias de desarrollo:

```sh
wrangler pages dev . --ip 127.0.0.1 --port 8799 --compatibility-date 2026-06-02
npm run check:http -- http://127.0.0.1:8799
```

Resultado: **30 verificaciones correctas**: 20 URLs del sitemap con HTTP 200 y canónica exacta, siete rutas inexistentes con 404 y sin canónica/schema, tres redirecciones 301 de packs retirados. Se comprueban el grafo único y las cinco entidades en los cuatro servicios. Prueba local con Wrangler 4.95.0; la fecha de compatibilidad utilizada es la máxima admitida por su runtime instalado. No se ha cambiado la configuración de producción.

La simulación de snapshots individuales pasa 41 verificaciones, incluyendo contenido sin JS, URLs canónicas, retirada de páginas y rechazo de HTML alterado. `npm run check:editorial` pasa sin diferencias después de la actualización local.

## Límites y revisión antes de publicar

- La base incluye trabajo previo de integración de snapshots; revisar ese contexto antes de integrar en main. La propuesta no activa esa infraestructura.
- Las pruebas HTTP se han ejecutado localmente con el CMS real como fuente de lectura. No acreditan que los cambios estén publicados. Repetirlas contra el entorno de destino cuando se autorice un despliegue.
- Los artículos publicados conservan el renderizado cliente existente en el modo legacy; la comprobación de existencia añade una consulta servidor con límite de cinco segundos. Una indisponibilidad del CMS produce 503.
- No se han alterado DNS, canonicals válidas de detalles, slugs, contenido editorial de WordPress ni redirecciones de packs.

Para revertir, revertir el commit de esta propuesta antes de publicar. No hay cambios remotos que deshacer.

## Referencias técnicas

- [Cloudflare Pages: serving pages y comportamiento 404/SPA](https://developers.cloudflare.com/pages/configuration/serving-pages/).
- [Cloudflare Pages: desarrollo local de Functions](https://developers.cloudflare.com/pages/functions/local-development/).
- [Schema.org: WebPage](https://schema.org/WebPage).
