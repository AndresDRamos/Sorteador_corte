# API HTTP (Express)

> **Cubre:** [server/src/routes/](../server/src/routes/), [server/src/index.js](../server/src/index.js)
> **Router:** `AGENTS.md → API HTTP (Express)`

## Propósito

Expone dos endpoints HTTP: subir un DXF y obtener su JSON normalizado, y consultar la ruta de proceso siguiente para una lista de part-numbers contra SQL Server.

## Endpoints

### `POST /api/nestings`

- Body: `multipart/form-data` con campo `file` (DXF).
- Límite: 20 MB ([nestings.js:11-14](../server/src/routes/nestings.js#L11-L14)).
- Respuesta 200: JSON normalizado (ver estructura en [docs/parsing.md](parsing.md)).
- Respuesta 400: falta el campo `file`.
- Respuesta 422: DXF malformado o versión no soportada por `dxf-parser`.

Implementación: [server/src/routes/nestings.js:16](../server/src/routes/nestings.js#L16). Encadena `parseDxfBuffer → extractParts → normalizeNesting`.

### `GET /api/nestings`

Stub de health-check informal que devuelve `{ "Hola": "Mundo" }` ([nestings.js:37](../server/src/routes/nestings.js#L37)).

### `POST /api/nextProcess`

- Body JSON: `{ partNumbers: string[] }` (no vacío, todos strings).
- Respuesta 200: `{ [partNumber]: { nextProcess: string | null, raw?: object } }`.
- Respuesta 400: validación de body.
- Respuesta 500: error de consulta a SQL Server.

Implementación: [server/src/routes/nextProcess.js:8](../server/src/routes/nextProcess.js#L8). Delega en `getNextProcess` ([docs/db.md](db.md)).

### `GET /health`

Health-check oficial. Devuelve `{ ok: true }` ([server/src/index.js:13](../server/src/index.js#L13)).

## Bootstrap

[server/src/index.js](../server/src/index.js) carga `.env` con `dotenv/config`, monta `express.json()` (los uploads van por multer en su propio router) y publica ambos routers bajo `/api`. Puerto desde `PORT` env (default 3000).

## Conceptos clave

- **Almacenamiento en memoria** para uploads (`multer.memoryStorage`): el archivo se procesa en la misma request y se descarta. No hay persistencia de DXFs.
- **Validación estricta** del body en `/nextProcess`: array no vacío y todos los elementos string, antes de tocar la BD.
- **Sin auth ni CORS configurados** — el frontend Vite se sirve aparte; el dev-server de Vite suele usar proxy para evitar CORS.
