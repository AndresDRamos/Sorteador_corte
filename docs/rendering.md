# Render SVG

> **Cubre:** [web/src/render/](../web/src/render/)
> **Router:** `AGENTS.md → Render SVG`

## Propósito

Convierte el JSON normalizado del backend en un `<svg>` listo para insertar en el DOM: aplica la transformación de cada INSERT (translate/rotate/scale), pinta loops cerrados con `fill-rule="evenodd"` para que los agujeros queden transparentes, y reencuadra al contenido real una vez en pantalla.

## API pública

- `renderNesting(nesting)` — [web/src/render/svgRenderer.js:123](../web/src/render/svgRenderer.js#L123). Devuelve `<svg>` listo para insertarse.
- `fitViewBoxToContent(svg, paddingRatio = 0.04)` — [web/src/render/svgRenderer.js:80](../web/src/render/svgRenderer.js#L80). Reencuadra el viewBox al bbox real del contenido. **Llamar después de insertar el SVG en el DOM** (requiere layout para `getBBox`).
- `buildViewBox(bounds)` — [web/src/render/viewBox.js:5](../web/src/render/viewBox.js#L5). ViewBox inicial a partir del bounds del header DXF (la hoja completa, ya con flip Y aplicado).
- `loopToPathD(loop)` — [web/src/render/entityToPath.js:33](../web/src/render/entityToPath.js#L33). Construye el atributo `d` de un loop.
- `loopsToCombinedPathD(loops)` — [web/src/render/entityToPath.js:102](../web/src/render/entityToPath.js#L102). Combina varios loops cerrados en un único `d` con subpaths `M..Z M..Z`.
- `entityToSvg(entity)` — [web/src/render/entityToPath.js:112](../web/src/render/entityToPath.js#L112). Fallback: una entidad suelta → un elemento SVG (`<line>`, `<circle>` o `<path>`).

## Conceptos clave

- **Flip vertical en el grupo raíz:** el SVG se construye en coordenadas DXF (Y arriba) y el grupo raíz aplica `transform="scale(1 -1)"`. Esto significa que el viewBox vive en el espacio post-flip (Y negada).
- **`fill-rule="evenodd"` requiere un único `<path>`:** evenodd solo opera entre subpaths del mismo elemento, no entre `<path>` hermanos. Por eso `loopsToCombinedPathD` concatena todos los loops cerrados con `M..Z M..Z` en un único `d` ([svgRenderer.js:44](../web/src/render/svgRenderer.js#L44)). Loops abiertos van como `<path>` separados sin fill.
- **Sweep flag de ARC = 1 normal, 0 invertido:** `entityToPath.js:75` calcula `sweep = reversed ? 0 : 1`. Combinado con el flip `scale(1,-1)` del grupo raíz, el sentido visual queda correcto. El `largeArc` se calcula sobre los ángulos DXF originales (no invertidos) para evitar elegir el arco complementario — síntoma sería esquinas cóncavas que se ven bombeadas hacia afuera ([entityToPath.js:66-74](../web/src/render/entityToPath.js#L66-L74)).
- **Orden de pintado por área descendente:** las instancias se ordenan por bbox del loop exterior mayor × |sx·sy| ([svgRenderer.js:149](../web/src/render/svgRenderer.js#L149)). Las piezas grandes se pintan primero y las chicas encima; si una chica cae en el hueco de una grande, evenodd deja ver la chica a través.
- **Doble pase de viewBox:** `buildViewBox` usa los bounds del header DXF (la hoja completa de corte). El nesteo real suele ocupar una fracción de la hoja y queda diminuto en una esquina. Por eso, una vez insertado en el DOM, `fitViewBoxToContent` mide el contenido vía `getBBox` y reencuadra. El stroke-width se recalcula como `max(width, height) * 0.0008` para mantenerse visible a cualquier escala ([svgRenderer.js:118](../web/src/render/svgRenderer.js#L118)).
- **Transform de INSERT en orden DXF:** `translate → rotate → scale` aplicado al grupo de cada instancia ([svgRenderer.js:34](../web/src/render/svgRenderer.js#L34)). Coincide con la semántica DXF al escribirse en ese orden en SVG.
- **Fallback sin loops:** si la pieza no trae `loops` (ej. solo entidades sueltas), cada entidad se pinta como elemento SVG suelto con `fill: none` ([svgRenderer.js:62-69](../web/src/render/svgRenderer.js#L62-L69)).
- **`vector-effect="non-scaling-stroke"`** en el grupo raíz para que el grosor de línea no se distorsione con zoom.

## Flujo

```
renderNesting(nesting)
  ├─ <svg viewBox=buildViewBox(bounds)>
  └─ <g transform="scale(1 -1)" stroke-width=... vector-effect=non-scaling-stroke>
       ├─ ordenar instancias por área desc
       └─ por cada instance:
            <g transform="translate(x y) rotate(rot) scale(sx sy)" data-part=... stroke=color>
              ├─ <path d=loopsToCombinedPathD(closed loops) fill=color fill-opacity=0.75>
              └─ <path d=loopToPathD(open loop) fill=none>   // uno por loop abierto
```

Después: `fitViewBoxToContent(svg)` para reencuadrar al contenido real.

## Logs de diagnóstico

`fitViewBoxToContent` imprime tres `console.log` con tamaño del viewer, bbox del contenido en espacio DXF y viewBox final ([svgRenderer.js:105-115](../web/src/render/svgRenderer.js#L105-L115)). Útiles para depurar encuadre.
