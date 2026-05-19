# Parsing DXF

> **Cubre:** [server/src/parsing/](../server/src/parsing/)
> **Router:** `AGENTS.md → Parsing DXF`

## Propósito

Convierte un buffer DXF en el JSON normalizado que consume el frontend: piezas con geometría agrupada en loops cerrados clasificados (contorno vs hueco), instancias (INSERTs) con su transformación y bounds del nesteo.

## API pública

- `parseDxfBuffer(buffer)` — [server/src/parsing/parseDxf.js:5](../server/src/parsing/parseDxf.js#L5). Wrapper sobre `dxf-parser`; asume UTF-8/ASCII.
- `extractParts(parsed)` — [server/src/parsing/extractParts.js:42](../server/src/parsing/extractParts.js#L42). Filtra BLOCKs reales (descarta datums) e INSERTs por part-number; devuelve `{ partDefinitions, instances, countByPart }`.
- `buildLoops(entities)` — [server/src/parsing/buildLoops.js:45](../server/src/parsing/buildLoops.js#L45). Reconstruye loops cerrados uniendo entidades por extremos coincidentes (EPSILON 1e-4); CIRCLE es un loop independiente. Aplica `joinOpenLoops` para fusionar loops abiertos cuyos extremos coincidan dentro de `1e-2` de tolerancia.
- `classifyLoops(loops)` — [server/src/parsing/classifyLoops.js:30](../server/src/parsing/classifyLoops.js#L30). Asigna `role: 'outer'|'hole'|'open'` y `depth` por anidamiento (paridad).
- `normalizeNesting(parsed, extracted)` — [server/src/parsing/normalizeNesting.js](../server/src/parsing/normalizeNesting.js). **Async.** Une todo: bounds, parts con color (por proceso siguiente) y loops, instancias. Consulta SQL Server vía `getNextProcess`.

## Conceptos clave

- **Blocks-datum se ignoran** por completo. Heurística: nombre termina en `DATUM` (case-insensitive) o pertenece al set `{MDATUM, ODATUM, TDATUM}`. Aplica tanto a definiciones como a INSERTs ([extractParts.js:6](../server/src/parsing/extractParts.js#L6)).
- **Entidades soportadas en v1:** `LINE`, `CIRCLE`, `ARC`. Cualquier otro tipo se descarta silenciosamente ([extractParts.js:12](../server/src/parsing/extractParts.js#L12)).
- **Tolerancia de unión de loops:** `EPSILON = 1e-4` con redondeo a la grilla `1/EPSILON` para comparar extremos ([buildLoops.js:5-10](../server/src/parsing/buildLoops.js#L5-L10)). Loops que no cierran salen con `closed: false`. **Fusión de abiertos:** `joinOpenLoops` fusiona pares de loops abiertos cuyos extremos coincidan dentro de `1e-2` — cubre errores de redondeo por truncamiento en la grilla sin unir loops legítimamente separados.
- **Clasificación robusta al winding:** la profundidad se calcula por **contención** (ray-cast `pointInPolygon`), no por dirección del recorrido. DXFs con direcciones inconsistentes igual se clasifican bien ([classifyLoops.js:1-4](../server/src/parsing/classifyLoops.js#L1-L4)).
- **Bounds del nesteo:** primero intenta `$EXTMIN/$EXTMAX`, luego `$LIMMIN/$LIMMAX`, y si nada existe usa el bbox de los INSERTs. Esto representa la hoja completa de corte, no el nesteo real (el frontend reencuadra al contenido — ver [docs/rendering.md](rendering.md)).
- **Ángulos de ARC** vienen en radianes desde `dxf-parser`, sentido antihorario desde +X.

## Flujo

```
parseDxfBuffer(buffer)
  → parsed (JSON crudo del DXF)
extractParts(parsed)
  → { partDefinitions, instances, countByPart }
normalizeNesting(parsed, extracted)   // async
  ├─ getNextProcess(partNumbers)            [docs/db.md]
  ├─ groupByPart: pn → nextProcess || 'Almacén Kiteo'
  ├─ assignColors(grupos)                   [docs/colors.md]
  ├─ buildLoops(entities) por pieza
  ├─ classifyLoops(loops) por pieza         [usa docs/geometry.md]
  └─ readBoundsFromHeader || computeBoundsFromInstances
  → { bounds, parts, instances }
```

## Estructura del JSON de salida

```js
{
  bounds: { min: [x, y], max: [x, y] },     // hoja completa según header
  parts: [{
    partNumber: string,
    nextProcess: string,                      // proceso siguiente o 'Almacén Kiteo' si la BD no devuelve ruta
    color: string,                            // hex por grupo (nextProcess), estable entre cargas
    count: number,                            // total de instancias
    entities: [...],                          // LINE/CIRCLE/ARC normalizadas
    loops: [{                                 // loops clasificados
      entities: [{ entity, reversed }],
      closed: boolean,
      role: 'outer' | 'hole' | 'open',
      depth: number | null,                   // null si role='open'
      bbox: { minX, minY, maxX, maxY }        // solo si closed
    }]
  }],
  instances: [{                               // INSERTs (uno por aparición)
    partNumber, x, y, sx, sy, rot            // rot en grados
  }]
}
```
