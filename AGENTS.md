# Proyecto: Sorteador de corte

## Contexto

Aplicación web que lee archivos DXF de nesteos (layouts de corte láser), los parsea, los renderiza en una aplicación web, y extrae los bloques de números de parte que conforman el nesteo para enlistarlos y agruparlos.

## Stack técnico

- Backend: Node.js con Express (`server/`)
- Frontend: Vite + JS vanilla, render SVG (`web/`)
- Parser DXF: `dxf-parser` (en `server/src/parsing/parseDxf.js`)
- Ruta siguiente: `server/src/db/getNextProcess.js` consulta SQL Server via `mssql` (pool en `server/src/db/sqlClient.js`)

## Variables de entorno (server/.env)

| Variable | Descripcion | Default |
|---|---|---|
| `DB_SERVER` | Host del servidor SQL Server | `localhost` |
| `DB_NAME` | Nombre de la base de datos | — |
| `DB_USER` | Usuario de conexion | — |
| `DB_PASSWORD` | Contrasena de conexion | — |
| `DB_PORT` | Puerto del servidor SQL | `1433` |
| `DB_ENCRYPT` | Habilitar encriptacion TLS (`true`/`false`) | `false` |
| `PORT` | Puerto del servidor Express | `3000` |

Ver `server/.env.example` como plantilla.

## Estructura

- `server/src/index.js` — bootstrap Express, monta `/api/nestings` y `/api/nextProcess`.
- `server/src/parsing/` — parseo DXF, extracción de bloques y normalización del nesteo.
- `server/src/colors/assignColors.js` — asignación estable de color por número de parte.
- `server/src/routes/nestings.js` — `POST /api/nestings` recibe DXF (multipart) y devuelve JSON normalizado.
- `POST /api/destinations/nextProcess` consulta ruta siguiente en SQL Server.
- `server/src/db/sqlClient.js` — pool singleton de conexion a SQL Server.
- `server/src/db/getNextProcess.js` — ejecuta el query de ruta siguiente y mapea resultados.
- `web/src/render/svgRenderer.js` — render SVG: aplica transform de INSERTs, flip Y, stroke por color.
- `web/src/render/entityToPath.js` — conversión de entidades DXF (LINE, CIRCLE, ARC) a SVG.
- `web/src/ui/` — uploader y panel lateral de piezas.
- `dxf-samples/` — DXFs de prueba.

## Convenciones de código

- Comentarios y nombres de variables en español.
- Nombres de funciones en inglés.
- Colocar siempre comentarios inline que expliquen el funcionamiento del código.

## Reglas para la IA

- Antes de generar código, verifica si existe lógica similar en el proyecto.
- Cuando propongas dependencias nuevas, justifica por qué.
- Si ves un patrón que rompe el estilo del repo, sugiérelo pero no lo apliques sin que te lo pidan.
- No agregues abstracciones ni refactors fuera del alcance pedido.
- Idioma de respuesta al usuario: español.
