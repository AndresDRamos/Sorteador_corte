# Geometría de loops

> **Cubre:** [server/src/geometry/](../server/src/geometry/)
> **Router:** `AGENTS.md → Geometría de loops`

## Propósito

Utilidades geométricas sobre loops reconstruidos por `buildLoops`: muestreo poligonal, bbox, point-in-polygon y área con signo. Consumido por `classifyLoops` para decidir `outer` vs `hole`.

## API pública

- `flattenLoop(loop, segPerArc = 24, segPerCircle = 48)` — [server/src/geometry/loopGeometry.js:17](../server/src/geometry/loopGeometry.js#L17). Convierte un loop (LINE/ARC/CIRCLE) en polígono `[[x, y], ...]`. Respeta `reversed` por entidad.
- `loopBBox(points)` — [server/src/geometry/loopGeometry.js:76](../server/src/geometry/loopGeometry.js#L76). Devuelve `{ minX, minY, maxX, maxY }`.
- `pointInPolygon(p, points)` — [server/src/geometry/loopGeometry.js:92](../server/src/geometry/loopGeometry.js#L92). Ray-cast horizontal estándar.
- `signedArea(points)` — [server/src/geometry/loopGeometry.js:109](../server/src/geometry/loopGeometry.js#L109). Shoelace; positiva = antihorario en sistema con Y arriba. Útil como desempate cuando dos loops tienen bbox idéntico.

## Conceptos clave

- **Sistema de coordenadas:** DXF puro (Y arriba). El flip vertical se aplica solo en el frontend, no aquí.
- **Muestreo de ARC:** `segPerArc = 24` segmentos por arco, sentido determinado por `arcSpan(start, end)` (siempre barrido positivo `(0, 2π]`). Mismo criterio que `entityToPath.js` para que polígonos y SVG sean consistentes.
- **CIRCLE cierra el loop:** una vez que `flattenLoop` encuentra un CIRCLE, deja de procesar más entidades del loop — el círculo se cierra a sí mismo ([loopGeometry.js:68](../server/src/geometry/loopGeometry.js#L68)).
- **Anti-duplicación:** `pushPoint` evita repetir el último punto cuando dos entidades comparten extremo exactamente ([loopGeometry.js:22-26](../server/src/geometry/loopGeometry.js#L22-L26)).
- **Robustez del ray-cast:** no requiere que el winding sea consistente porque solo prueba cruces de aristas. Funciona con cualquier orientación.

## Flujo

```
classifyLoops(loops)
  └─ por cada loop cerrado:
       flattenLoop(loop)        → points
       loopBBox(points)         → bbox
       representativePoint      → primer vértice
     y luego:
       para cada (item, other) cerrado distinto:
         bboxContains(other.bbox, item.bbox)      // prefiltro barato
         && pointInPolygon(item.sample, other.points)
         → depth++
       role = depth % 2 === 0 ? 'outer' : 'hole'
```
