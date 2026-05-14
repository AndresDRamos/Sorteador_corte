# Plan: Ignorar completamente los blocks DATUM

## Contexto

Los blocks cuyos nombres terminan en `DATUM` (`MDATUM`, `ODATUM`, `TDATUM`) son marcadores de origen / líneas guía dentro del DXF, no piezas reales. Hoy el pipeline ya los **separa** pero los sigue **parseando y renderizando en gris** ([extractParts.js:46-77](server/src/parsing/extractParts.js#L46-L77), [normalizeNesting.js:45-51](server/src/parsing/normalizeNesting.js#L45-L51), [svgRenderer.js:116-131](web/src/render/svgRenderer.js#L116-L131)).

El usuario quiere ignorarlos por completo: ni parsear sus entidades, ni transportarlas al cliente, ni dibujarlas. La heurística existente `isDatumName()` ya identifica correctamente estos blocks, así que el cambio es estrictamente de **eliminación de código**.

## Cambios

### 1. [server/src/parsing/extractParts.js](server/src/parsing/extractParts.js)

- Eliminar `datumDefinitions` (líneas 46, 52, 87).
- Eliminar `datumInstances` (líneas 62, 76-77, 89).
- En el bucle de blocks (línea 48-57): si `isDatumName(name)` → `continue` (saltar sin normalizar entidades). De esa forma no se invoca `normalizeBlockEntities` sobre datums.
- En el bucle de INSERTs (línea 65-83): si `isDatumName(partNumber)` → `continue`.
- Mantener la constante `DATUM_BLOCK_NAMES` y la función `isDatumName` (siguen siendo el criterio para ignorar).
- `return` final queda con `{ partDefinitions, instances, countByPart }`.

### 2. [server/src/parsing/normalizeNesting.js](server/src/parsing/normalizeNesting.js)

- Línea 30: quitar `datumDefinitions` y `datumInstances` del destructuring.
- Líneas 45-51: eliminar el bloque que construye `datums`.
- Línea 59: eliminar `datums` del objeto retornado.

### 3. [web/src/render/svgRenderer.js](web/src/render/svgRenderer.js)

- Eliminar el bloque completo de renderizado de datums (líneas 116-131).

### 4. [web/src/styles.css](web/src/styles.css)

- Eliminar la regla `.viewer svg .datums { stroke: #bbb; }` y su comentario (líneas 47-48), ya no aplica a nada.

## Archivos a modificar

- `server/src/parsing/extractParts.js`
- `server/src/parsing/normalizeNesting.js`
- `web/src/render/svgRenderer.js`
- `web/src/styles.css`

## Verificación

1. Arrancar server (`npm run dev` o equivalente en `/server`) y frontend (`npm run dev` en `/web`).
2. Subir un DXF de `server/samples/` que contenga blocks `MDATUM`/`ODATUM`/`TDATUM`.
3. Verificar en el viewer:
   - Las líneas guía grises ya **no aparecen**.
   - Las piezas reales se siguen dibujando con sus colores y se reconstruyen sus loops cerrados.
   - El bounding box / encuadre sigue siendo correcto (se calcula desde header o desde `instances`, ninguna de las dos fuentes depende de datums).
4. Inspeccionar la respuesta JSON del endpoint de nesting en Network: confirmar que `datums` ya no existe en el payload.
5. Probar el flujo de "next-route" sobre una pieza para asegurar que no se rompió nada de la integración SQL Server (los datums nunca participaron en eso, pero conviene confirmar).
