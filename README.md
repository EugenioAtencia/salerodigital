# Salero Digital - frontend HTML externo

Primera versión del frontend headless conectado a WordPress.

CMS conectado:
https://cms.webagencia360.com/wp-json/wp/v2

## Probar en local

Abre una terminal dentro de esta carpeta y ejecuta:

python3 -m http.server 8000

Después entra en:

http://localhost:8000

No abras los archivos directamente con file:// porque algunas peticiones fetch pueden fallar.

## Subir a SiteGround

1. Crea un subdominio, por ejemplo salero.webagencia360.com.
2. Sube todo el contenido de esta carpeta a la raíz del subdominio.
3. Comprueba que carga la home y que se renderizan servicios, menús y sectores desde el CMS.

## Nota SEO

Esta versión sirve para validar la arquitectura headless. Para producción SEO conviene evolucionarla a Astro o Next para generar HTML estático con metadatos únicos por URL.


## Colecciones SSG — fase 1 y Home aprobadas

Requiere Node.js 22 o posterior, sin dependencias npm. WordPress sigue siendo la
fuente de servicios, sectores, casos y artículos. Los HTML publicados son resultados
automáticos: no editar sus tarjetas a mano.

```sh
node scripts/generate-collections-ssg.mjs --dry-run
node scripts/generate-collections-ssg.mjs
node tests/collections-ssg-simulation.mjs
```

El generador consulta todas las páginas REST y exige respuestas JSON públicas con
`X-WP-Total` y `X-WP-TotalPages` coherentes. Primero descarga y valida las cuatro
colecciones y renderiza todos los documentos en memoria; solo después escribe.
Un error termina con código distinto de cero. No publicar ni hacer push si falla.
Una colección vacía solo se acepta con HTTP correcto, array vacío y totales cero.

Conserva orden REST (fecha descendente), plantillas de tarjetas del cliente, copy
editorial, titles, metas y canonicals existentes. Genera 12 artículos por página,
URLs `/la-rebotica/page/{n}/` con canonical propia y enlaces anterior/siguiente.
El HTML y el ItemList utilizan los mismos registros. El middleware respeta el
schema generado mediante el identificador existente `salero-schema-graph`.
Los clientes no vuelven a consultar el CMS al arrancar sobre HTML SSG. El blog
mejora la navegación descargando la siguiente página HTML, sin depender del CMS.

La extensión Home reutiliza esas mismas colecciones validadas de servicios y
sectores, sin nuevas descargas. Solo sustituye `data-home-servicios` y
`data-home-sectores` en `index.html`, usando las funciones originales de
`home.js`: filas de servicios y tarjetas de sectores, con su orden REST, copy,
clases y enlaces. No modifica el schema de Home. La marca
`data-ssg="collections"` evita peticiones CMS y reemplazos al iniciar Home;
sin esa marca se conserva el fallback dinámico anterior.

Los casos se muestran en flujo normal antes de inicializar el carrusel; una regla
local en su HTML deja de aplicarse cuando la inicialización termina. No se cambia
ningún archivo CSS.

Producción conserva el comando de build vacío y la instantánea HTML aprobada.
La Fase 2A prepara un build editorial y un MU-plugin portable en
`codex/cms-auto-deploy`, sin activarlos en producción. No hay Deploy Hook real ni
MU-plugin instalado. Véase [preparación y activación posterior](docs/editorial-automation.md).

Validación de fallo: la simulación genera una versión válida en una carpeta
temporal, provoca un 500 en la última colección y comprueba que todos los HTML
anteriores quedan idénticos. Incluye 12, 13, 20, 50 y 200 artículos, paginación REST,
timeout, errores HTTP, JSON inválido, datos incompletos, duplicados, schema,
middleware y conservación del HTML por los clientes.
Incluye Home: cuatro servicios, tres sectores, enlaces únicos, equivalencia exacta
con sus renderers dinámicos, inicializaciones repetidas sin fetch ni duplicación
y conservación de `index.html` ante un fallo tardío del CMS. La fase de renderizado HTML está integrada en `main`.

## Preparación editorial — Fase 2A

```sh
npm test
php -l integrations/wordpress/salero-pages-publish.php
php tests/editorial-mu-plugin-simulation.php
php tests/editorial-mu-plugin-simulation.php --disabled
```

Build propuesto para Fase 2B: `node scripts/build-editorial-ssg.mjs`. Exige el
endpoint de revisión del MU-plugin y aborta si falta. Solo en el Preview 2A se usa
`node scripts/build-editorial-ssg.mjs --snapshot-check`, con dos lecturas completas
del CMS; no equivale a activar el control editorial final. No mergear ni instalar
el plugin como parte de esta preparación.
