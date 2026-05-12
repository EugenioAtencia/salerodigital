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
