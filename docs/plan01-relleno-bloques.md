# Plan 01 — Relleno de piezas del DXF

## Objetivo

Que cada pieza (bloque/INSERT) del DXF no se muestre solo como contorno vectorial, sino como una región **rellena** con el color asignado al número de parte. Hoy el render solo aplica `stroke`; necesitamos `fill` por pieza.

## Problema actual

En [web/src/render/svgRenderer.js](../web/src/render/svgRenderer.js):
- El grupo de instancia se construye con `stroke = part.color` y `fill = 'none'`.
- Cada entidad (LINE, CIRCLE, ARC) se emite como elemento SVG independiente (`<line>`, `<circle>`, `<path>` de arco abierto).
- Como las LINEs son entidades sueltas, el navegador no sabe que juntas forman un contorno cerrado, por lo tanto no se puede rellenar directamente con `fill`.

Para rellenar hace falta **reconstruir el contorno cerrado** de cada pieza concatenando sus entidades en orden, y emitirlo como un único `<path>` con subpaths cerrados (`Z`). Esto es el "loop de trazado" mencionado.

## Enfoque propuesto

### 1. Construcción de loops en el backend (preferido)

En la etapa de normalización ([server/src/parsing/normalizeNesting.js](../server/src/parsing/normalizeNesting.js)) o en un módulo nuevo `server/src/parsing/buildLoops.js`:

- Para cada `partDefinition`, recorrer sus `entities` y agruparlas en **loops cerrados** uniendo entidades cuyos extremos coincidan (con tolerancia `epsilon`, p. ej. `1e-4`).
- Algoritmo:
  1. Construir un índice de extremos: `Map<puntoRedondeado, entidad[]>`.
  2. Tomar una entidad inicial no visitada; seguir conectando por el extremo libre hasta cerrar el loop o agotar conexiones.
  3. Marcar las entidades usadas y repetir hasta agotar.
  4. Si una entidad es un `CIRCLE`, ya es un loop cerrado por sí mismo.
- Salida: cada `part` tendrá adicionalmente un campo `loops: Array<{ entities: Entity[], closed: boolean }>`.
- Las entidades sueltas que no cierran (p. ej. marcas de centro) quedan en un loop `closed: false` y se renderizan solo como stroke.

### 2. Render de loops en el frontend

En [web/src/render/entityToPath.js](../web/src/render/entityToPath.js) y [web/src/render/svgRenderer.js](../web/src/render/svgRenderer.js):

- Añadir una función `loopToPathD(loop)` que concatene los segmentos del loop como un único atributo `d`:
  - Primer entidad → `M x y` al punto inicial.
  - LINE → `L x2 y2`.
  - ARC → `A r r 0 largeArc sweep x2 y2` (cuidando dirección según el extremo por el que se enlazó).
  - CIRCLE solo → dos arcos `A` que dibujen el círculo completo y `Z`.
  - Cerrar con `Z` si `loop.closed`.
- En `buildInstanceGroup`, en lugar de emitir una entidad por hijo:
  - Emitir un `<path>` por cada loop cerrado con `fill = part.color` y `stroke = part.color`.
  - Para loops abiertos (`closed: false`), emitir un `<path>` con `fill = none` y `stroke = part.color` (comportamiento actual).
- Aplicar `fill-rule: evenodd` al grupo raíz para que agujeros internos (loops anidados, p. ej. un círculo dentro de un rectángulo) queden transparentes correctamente.

### 3. Consideraciones visuales

- Las piezas se rellenarán con el color asignado por `assignColors`. Si la opacidad es 100%, las piezas se vuelven sólidas y se pierde la lectura de geometría interna:
  - `fill-opacity` ~ `0.75` y mantener stroke al 100%.
- Los `datums` (geometría auxiliar) siguen sin relleno (solo stroke gris).

### 4. Validación

- Probar con los 3 archivos en `dxf-samples/`.
- Verificar:
  - Piezas con contorno simple (rectángulos) se rellenan.
  - Piezas con agujeros (loop interno) muestran agujero transparente vía `evenodd`.
  - Datums siguen sin relleno.
  - Sin warnings en consola al cargar.

## Archivos a tocar

- `server/src/parsing/normalizeNesting.js` — invocar `buildLoops` y añadir `loops` al output.
- `server/src/parsing/buildLoops.js` — **nuevo**, algoritmo de unión de extremos.
- `web/src/render/entityToPath.js` — añadir `loopToPathD`.
- `web/src/render/svgRenderer.js` — emitir `<path>` por loop con `fill`.
- `web/src/styles.css` — opcional: regla global `fill-opacity` para `[data-part]`.

## Fuera de alcance

- Soporte de POLYLINE/LWPOLYLINE/SPLINE/ELLIPSE (los DXFs de muestra solo usan LINE/CIRCLE/ARC).
- Detección automática de "loop exterior vs. interior" más allá de lo que cubre `evenodd`.
