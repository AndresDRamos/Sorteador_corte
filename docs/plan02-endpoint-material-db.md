# Plan 02 — Endpoint de "ruta siguiente" con consulta a base de datos SQL

## Objetivo

Exponer un endpoint en el backend que, dado el conjunto de números de parte (bloques) extraídos del DXF cargado, consulte la base de datos SQL Server y devuelva la **ruta siguiente** de cada número de parte. El frontend, de momento, solo consume el endpoint e imprime el resultado en consola (no se renderiza en UI todavía).

## Estado actual

- Ya existe [server/src/routes/destinations.js](../server/src/routes/destinations.js) con `POST /api/destinations/lookup` que recibe `{ partNumbers: string[] }` y delega en [server/src/db/lookupDestinations.js](../server/src/db/lookupDestinations.js), hoy un **stub mock**.
- El frontend ya conoce los part-numbers tras parsear el DXF (campo `parts[].partNumber` del JSON normalizado).
- No hay conexión real a SQL Server.

Aprovechamos esta superficie en lugar de inventar un endpoint nuevo: el contrato `{ partNumbers } → { [pn]: { ... } }` se mantiene; cambia la implementación interna.

## Alcance de este plan

1. Crear un nuevo endpoint dedicado a "ruta siguiente" (o adaptar el existente) que ejecute el query SQL real.
2. Conectar a SQL Server desde Node.
3. Cliente frontend que dispare la consulta tras parsear el DXF y haga `console.log` del resultado.

## Diseño

### 1. Endpoint

Ruta: `POST /api/destinations/next-route`

Request body:

```json
{ "partNumbers": ["PN-001", "PN-002", ...] }
```

Response:

```json
{
  "PN-001": { "nextRoute": "OP-30", "raw": { ... } },
  "PN-002": { "nextRoute": null }
}
```

- `nextRoute` `null` cuando el part-number no exista en la BD o no tenga siguiente operación.
- `raw` opcional: fila cruda devuelta, útil para depurar durante el desarrollo.

### 2. Conexión a SQL Server

Dependencia propuesta: **`mssql`** (driver oficial mantenido por Microsoft, soporta pool de conexiones, parámetros tipados). Justificación: es el estándar de facto para SQL Server en Node, evita inyección con parámetros tipados, y soporta `IN (...)` mediante `TVP` o expansión segura de parámetros.

Configuración en `server/src/db/sqlClient.js` (nuevo):

- Leer credenciales de variables de entorno: `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Inicializar un único `ConnectionPool` y reutilizarlo (`getPool()`).
- Manejar reconexión automática del pool.

Documentar en `AGENTS.md` las variables de entorno del archivo .env en la raíz del proyecto.

### 3. Query

> **TODO (usuario):** pegar aquí el query exacto. Placeholder mientras tanto:

```sql
-- ===========================================================================
-- QUERY DE "RUTA SIGUIENTE"
-- Parámetros esperados:
--   @partNumbers : lista de números de parte (vía TVP o expansión IN)
-- Columnas esperadas en el result set (ajustar nombres en el código si cambian):
--   PartNumber  -- número de parte (clave para mapear al objeto de respuesta)
--   NextRoute   -- string con la ruta siguiente
-- ===========================================================================

DECLARE @PartNumbers NVARCHAR(50) ;
SELECT
               M.idMaterial
              ,M.ClaveMaterial AS PartNumber
              ,MRT.idRuta
              ,R.Nombre        AS NextRoute
FROM           tblMaterial              AS M
   INNER JOIN  dbo.vwMaterialRutaTiempo AS MRT
               ON MRT.idMaterial = M.idMaterial

   INNER JOIN  dbo.tblRuta              AS R
               ON R.idRuta = MRT.idRuta
WHERE
               M.ClaveMaterial = @PartNumbers
               AND MRT.NoAsc = 2 ;

```

Estrategia de parametrización segura recomendada con `mssql`:

- Crear un Table-Valued Parameter `dbo.PartNumberList(PartNumber NVARCHAR(64))` en la BD, o
- Si no se puede tocar la BD: expandir como `@pn0, @pn1, ...` bindeando cada uno como `NVarChar`. **Nunca** concatenar strings al SQL.

### 4. Implementación backend

- `server/src/db/sqlClient.js` — **nuevo**: pool singleton.
- `server/src/db/getNextRoutes.js` — **nuevo**: ejecuta el query, mapea filas a `{ [partNumber]: { nextRoute, raw } }`.
- `server/src/routes/destinations.js` — añadir handler `POST /next-route` que:
  1. Valida `partNumbers: string[]` no vacío.
  2. Llama a `getNextRoutes(partNumbers)`.
  3. Rellena con `nextRoute: null` los part-numbers que no aparezcan en el result set.
  4. Devuelve JSON.
- Mantener `POST /lookup` (mock) intacto hasta que se valide la nueva ruta.

Manejo de errores:

- Errores de conexión / query → `500` con `{ error, detail }` (sin filtrar credenciales).
- Body inválido → `400`.
- Lista vacía → `200` con `{}`.

### 5. Frontend (consumir e imprimir en consola)

- `web/src/api/nestingsClient.js` — añadir `fetchNextRoutes(partNumbers)` que hace `POST /api/destinations/next-route`.
- `web/src/main.js` (o donde se procesa el JSON del nesteo tras el upload):
  - Tras renderizar, extraer `partNumbers = nesting.parts.map(p => p.partNumber)`.
  - Llamar a `fetchNextRoutes(partNumbers)`.
  - `console.log('[next-route]', resultado)`.
  - No se toca UI; es solo wiring inicial.

### 6. Validación

- Levantar `server` con `.env` apuntando a la BD real, levantar `web`.
- Subir un DXF de `dxf-samples/`.
- Confirmar en la consola del navegador el objeto con las rutas siguientes.
- Probar con un part-number inexistente → debe aparecer con `nextRoute: null`.
- Probar con BD caída → `console.error` con el `500` del backend; el viewer DXF sigue funcionando.

## Archivos a tocar

- `server/package.json` — añadir `mssql` y `dotenv`.
- `server/src/index.js` — cargar `dotenv` al inicio.
- `server/src/db/sqlClient.js` — **nuevo**.
- `server/src/db/getNextRoutes.js` — **nuevo**.
- `server/src/routes/destinations.js` — añadir handler `/next-route`.
- `web/src/api/nestingsClient.js` — añadir `fetchNextRoutes`.
- `web/src/main.js` — disparar la consulta tras el upload e imprimir en consola.
- `.env.example` — **nuevo** en `server/`.

## Fuera de alcance

- Renderizar la ruta siguiente en UI (panel/columna). Será un plan posterior.
- Cachear resultados.
- Autenticación/autorización del endpoint.
- Migrar el mock `lookupDestinations` a SQL (se mantendrá hasta confirmar el nuevo flujo).
