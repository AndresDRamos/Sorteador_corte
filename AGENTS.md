# Proyecto: Sorteador de corte

## Contexto

Aplicación web que lee archivos DXF de nesteos (layouts de corte láser), los parsea, los renderiza en SVG y extrae los bloques de números de parte para enlistarlos y agruparlos. Además consulta SQL Server para obtener la ruta de proceso siguiente de cada part-number.

## Stack

- **Backend:** Node.js + Express ([server/](server/))
- **Frontend:** Vite + JS vanilla, render SVG ([web/](web/))
- **Parser DXF:** `dxf-parser` (npm)
- **DB:** SQL Server vía `mssql` (pool singleton)

## Variables de entorno (`server/.env`)

| Variable | Descripción | Default |
| --- | --- | --- |
| `DB_SERVER` | Host del servidor SQL Server | `localhost` |
| `DB_NAME` | Nombre de la base de datos | — |
| `DB_USER` | Usuario de conexión | — |
| `DB_PASSWORD` | Contraseña de conexión | — |
| `DB_PORT` | Puerto del servidor SQL | `1433` |
| `DB_ENCRYPT` | Encriptación TLS (`true`/`false`) | `false` |
| `PORT` | Puerto del servidor Express | `3000` |

Plantilla: [server/.env.example](server/.env.example).

## Router de documentación

Este archivo es un **router**. Para profundizar en cualquier tema, abre solo el doc correspondiente — no recorras el repo entero.

| Tema | Archivos que cubre | Doc |
| --- | --- | --- |
| Parsing DXF | [server/src/parsing/](server/src/parsing/) | [docs/parsing.md](docs/parsing.md) |
| Geometría de loops | [server/src/geometry/](server/src/geometry/) | [docs/geometry.md](docs/geometry.md) |
| Asignación de colores | [server/src/colors/](server/src/colors/) | [docs/colors.md](docs/colors.md) |
| API HTTP (Express) | [server/src/routes/](server/src/routes/), [server/src/index.js](server/src/index.js) | [docs/api.md](docs/api.md) |
| Base de datos (SQL Server) | [server/src/db/](server/src/db/) | [docs/db.md](docs/db.md) |
| Render SVG | [web/src/render/](web/src/render/) | [docs/rendering.md](docs/rendering.md) |
| UI (uploader, panel) | [web/src/ui/](web/src/ui/), [web/src/main.js](web/src/main.js), [web/src/api/](web/src/api/) | [docs/ui.md](docs/ui.md) |

**Cómo usar el router:** dado un prompt, identifica las palabras clave en "Tema" o los archivos en "Cubre". Lee solo el doc correspondiente. Si la pregunta abarca varios temas, lee los docs en orden de relevancia y detente cuando tengas la respuesta.

**Subagente documentador:** existe un subagente `project-docs` ([.claude/agents/project-docs.md](.claude/agents/project-docs.md) y [.opencode/agent/project-docs.md](.opencode/agent/project-docs.md)) que mantiene este router y `docs/` sincronizados con el código. Modos: `index`, `update <ruta>`, `query <pregunta>`.

## Convenciones de código

- Comentarios y nombres de variables en **español**.
- Nombres de funciones en **inglés**.
- Comentarios inline que expliquen el "por qué" del código, no el "qué".

## Reglas para la IA

- Antes de generar código, verifica si existe lógica similar en el proyecto.
- Cuando propongas dependencias nuevas, justifica por qué.
- Si ves un patrón que rompe el estilo del repo, sugiérelo pero no lo apliques sin que te lo pidan.
- No agregues abstracciones ni refactors fuera del alcance pedido.
- Idioma de respuesta al usuario: **español**.
