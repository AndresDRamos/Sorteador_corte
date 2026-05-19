# UI (uploader, panel, cliente HTTP)

> **Cubre:** [web/src/ui/](../web/src/ui/), [web/src/main.js](../web/src/main.js), [web/src/api/](../web/src/api/), [web/src/styles.css](../web/src/styles.css)
> **Router:** `AGENTS.md → UI (uploader, panel)`

## Propósito

Capa de presentación: monta el control de subida, dispara la llamada al backend, renderiza el SVG y pinta el panel inferior de **tarjetas agrupadas por proceso siguiente** con highlight bidireccional. El backend ya incluye `nextProcess` y el color por grupo en la respuesta del upload, así que la UI no hace una llamada separada por la ruta.

**Layout:** visor SVG ocupa el 70% superior (a todo lo ancho), panel de agrupaciones ocupa el 30% inferior con scroll horizontal de tarjetas.

## API pública

- `mountUploader(slot, { onFile })` — [web/src/ui/uploader.js:4](../web/src/ui/uploader.js#L4). Inserta `<label class="uploader">` con `<input type="file" accept=".dxf">`. Notifica al caller con el File seleccionado. Resetea `input.value` tras cada selección para permitir resubir el mismo archivo.
- `renderPartsPanel(listEl, parts, viewerEl)` — [web/src/ui/partsPanel.js:3](../web/src/ui/partsPanel.js#L3). Agrupa las piezas por `nextProcess` y pinta una `<article.group-card>` por grupo (encabezado con nombre del proceso + color + conteo; lista interna de part-numbers ordenados). Cada `<li>` lleva `data-part` para el highlight bidireccional.
- `uploadNesting(file)` — [web/src/api/nestingsClient.js:3](../web/src/api/nestingsClient.js#L3). `POST /api/nestings` con `FormData`, campo `file`.
- `fetchNextProcess(partNumbers)` — [web/src/api/nestingsClient.js:15](../web/src/api/nestingsClient.js#L15). `POST /api/nextProcess` con JSON `{ partNumbers }`. **No se usa desde el flujo principal** (el upload ya trae `nextProcess` por pieza); se mantiene para consumidores externos o herramientas de diagnóstico.

## Conceptos clave

- **Agrupación por proceso siguiente:** las piezas se agrupan en `Map<nextProcess, { color, parts }>`. El color se toma de la primera pieza del bucket porque por contrato todas las piezas del grupo comparten color (ver [docs/colors.md](colors.md)).
- **Highlight bidireccional:** al hacer `mouseenter` sobre un `<li>` del panel, se le añade la clase `.highlight` a todos los `<g data-part="...">` coincidentes en el SVG, y al `<svg>` mismo se le toggle `.has-highlight` (para que el resto se atenúe vía CSS). Se usa `CSS.escape` por si el part-number tiene caracteres especiales.
- **Orden alfabético estable** tanto de grupos como de part-numbers dentro de cada grupo, para que el operador encuentre cada pieza siempre en el mismo lugar.
- **Feedback inmediato durante upload:** mientras se procesa el DXF se muestra "Procesando DXF..." y se limpia la lista ([main.js:14-17](../web/src/main.js#L14-L17)). En error se pinta el mensaje en rojo.
- **`fitViewBoxToContent` se llama después de insertar el SVG**, no antes — requiere layout. Ver gotcha en [docs/rendering.md](rendering.md).
- **Errores del backend** se exponen al usuario mediante `err.error` del JSON de respuesta; si no hay JSON, se cae al mensaje genérico con código HTTP ([nestingsClient.js:9-11](../web/src/api/nestingsClient.js#L9-L11)).

## Flujo

```
main.js: DOMReady
  mountUploader(slot, { onFile })
    └─ usuario selecciona DXF
       ├─ viewerEl.innerHTML = "Procesando..."
       ├─ uploadNesting(file)         → nesting JSON
       ├─ renderNesting(nesting)      → <svg>            [docs/rendering.md]
       ├─ appendChild(svg)
       ├─ fitViewBoxToContent(svg)
       └─ renderPartsPanel(listEl, nesting.parts, viewerEl)
```

## Estilos

[web/src/styles.css](../web/src/styles.css) — layout vertical (`.layout` column, `.viewer` flex 70%, `.panel` flex 30%). Clases relevantes: `.uploader`, `.parts-list` (flex row), `.group-card`, `.group-header`, `.group-parts`, `.group-parts li.highlight`, `svg.has-highlight g:not(.highlight)`. La variable CSS `--group-color` se setea por tarjeta y alimenta el borde superior y el swatch del encabezado.
