# Base de datos (SQL Server)

> **Cubre:** [server/src/db/](../server/src/db/)
> **Router:** `AGENTS.md → Base de datos (SQL Server)`

## Propósito

Conexión a SQL Server mediante `mssql` y consulta de la ruta de proceso siguiente git reset --hard HEADpara una lista de part-numbers. Pool singleton reutilizable durante la vida del servidor.

## API pública

- `getPool()` — [server/src/db/sqlClient.js:31](../server/src/db/sqlClient.js#L31). Devuelve el pool activo; lo crea si no existe o se cerró.
- `sql` — re-export de `mssql` para usar sus tipos (`sql.NVarChar`, etc.) en queries parametrizadas.
- `getNextProcess(partNumbers)` — [server/src/db/getNextProcess.js:10](../server/src/db/getNextProcess.js#L10). Devuelve `{ [partNumber]: { nextProcess: string | null, raw?: object } }`.

## Conceptos clave

- **Pool singleton** con `max: 10, min: 0, idleTimeoutMillis: 30000` ([sqlClient.js:18-22](../server/src/db/sqlClient.js#L18-L22)). Un listener `pool.on('error')` invalida el pool si se cierra, forzando reconexión en la siguiente llamada.
- **Encriptación TLS opcional** controlada por `DB_ENCRYPT` env. `trustServerCertificate: true` siempre — apto para entornos internos con certificados self-signed.
- **Queries parametrizadas obligatoriamente:** la cláusula `IN` se expande como `(@pn0, @pn1, ...)` con `request.input()` por cada elemento ([getNextProcess.js:15-21](../server/src/db/getNextProcess.js#L15-L21)). Nunca se concatena el part-number en el SQL.
- **Forma de la respuesta:** se inicializa el mapa con `nextProcess: null` para todos los solicitados, y se sobreescriben solo los que devolvió la BD. Garantiza que el cliente siempre reciba una entrada por part-number pedido.

## Query

```sql
SELECT
  M.ClaveMaterial AS PartNumber,
  R.Nombre        AS NextProcess
FROM           tblMaterial              AS M
  INNER JOIN  dbo.vwMaterialRutaTiempo AS MRT ON MRT.idMaterial = M.idMaterial
  INNER JOIN  dbo.tblRuta              AS R   ON R.idRuta       = MRT.idRuta
WHERE
  M.ClaveMaterial IN (@pn0, @pn1, ...)
  AND MRT.NoAsc = 2          -- NoAsc=2 representa "siguiente proceso"
```

Ver [server/src/db/getNextProcess.js:25-37](../server/src/db/getNextProcess.js#L25-L37).
