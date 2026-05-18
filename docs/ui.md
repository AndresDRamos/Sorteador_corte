# UI (uploader, panel, cliente HTTP)

> **Cubre:** [web/src/ui/](../web/src/ui/), [web/src/main.js](../web/src/main.js), [web/src/api/](../web/src/api/), [web/src/styles.css](../web/src/styles.css)
> **Router:** `AGENTS.md → UI (uploader, panel)`

## Propósito

Capa de presentación: monta el control de subida, dispara la llamada al backend, renderiza el SVG, pinta el panel lateral de partes con highlight bidireccional, y consulta la ruta siguiente en paralelo.

## API pública

- `mountUploader(slot, { onFile })` — [web/src/ui/uploader.js:4](../web/src/ui/uploader.js#L4). Inserta `<label class="uploader">` con `<input type="file" accept=".dxf">`. Notifica al caller con el File seleccionado. Resetea `input.value` tras cada selección para permitir resubir el mismo archivo.
- `renderPartsPanel(listEl, parts, viewerEl)` — [web/src/ui/partsPanel.js:3](../web/src/ui/partsPanel.js#L3). Pinta la lista lateral ordenada alfabéticamente por part-number. Cada `<li>` lleva `data-part` y un swatch de color.
- `uploadNesting(file)` — [web/src/api/nestingsClient.js:3](../web/src/api/nestingsClient.js#L3). `POST /api/nestings` con `FormData`, campo `file`.
- `fetchNextProcess(partNumbers)` — [web/src/api/nestingsClient.js:15](../web/src/api/nestingsClient.js#L15). `POST /api/nextProcess` con JSON `{ partNumbers }`.

## Conceptos clave

- **Highlight bidireccional:** al hacer `mouseenter` sobre un `<li>` del panel, se le añade la clase `.highlight` a todos los `<g data-part="...">` coincidentes en el SVG, y al `<svg>` mismo se le toggle `.has-highlight` (para que el resto se atenúe vía CSS). Se usa `CSS.escape` por si el part-number tiene caracteres especiales ([partsPanel.js:28](../web/src/ui/partsPanel.js#L28)).
- **Orden alfabético estable** en el panel para que el operador encuentre la pieza siempre en el mismo lugar al recargar ([partsPanel.js:6](../web/src/ui/partsPanel.js#L6)).
- **Feedback inmediato durante upload:** mientras se procesa el DXF se muestra "Procesando DXF..." y se limpia la lista ([main.js:14-17](../web/src/main.js#L14-L17)). En error se pinta el mensaje en rojo.
- **`fitViewBoxToContent` se llama después de insertar el SVG**, no antes — requiere layout. Ver gotcha en [docs/rendering.md](rendering.md).
- **Consulta de ruta siguiente en paralelo:** `fetchNextProcess` se dispara fire-and-forget tras renderizar; el resultado solo se loguea por ahora ([main.js:29-32](../web/src/main.js#L29-L32)).
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
       ├─ renderPartsPanel(listEl, nesting.parts, viewerEl)
       └─ fetchNextProcess(partNumbers)  // paralelo, solo console.log
```

## Estilos

[web/src/styles.css](../web/src/styles.css) — clases relevantes: `.uploader`, `.parts-panel li.highlight`, `svg.has-highlight g:not(.highlight)`.
