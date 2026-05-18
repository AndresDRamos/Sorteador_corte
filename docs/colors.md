# Asignación de colores

> **Cubre:** [server/src/colors/](../server/src/colors/)
> **Router:** `AGENTS.md → Asignación de colores`

## Propósito

Asigna un color hex estable a cada part-number usando un hash determinista. Garantiza que el mismo part-number reciba el mismo color entre cargas distintas (importante para que el operador reconozca piezas visualmente entre nesteos).

## API pública

- `assignColors(partNumbers)` — [server/src/colors/assignColors.js:23](../server/src/colors/assignColors.js#L23). Devuelve `Map<partNumber, color>`.

## Conceptos clave

- **Paleta fija de 20 colores** con buen contraste sobre fondo claro (basada en Kelly / Sasha Trubetskoy) — [assignColors.js:5-10](../server/src/colors/assignColors.js#L5-L10).
- **Hash djb2** sobre el string del part-number, módulo `PALETTE.length` ([assignColors.js:13](../server/src/colors/assignColors.js#L13)). Suficiente para distribuir N partes uniformemente.
- **Colisiones:** con más de 20 part-numbers distintos habrá colores repetidos por diseño. La estabilidad pesa más que la unicidad.
- **No depende del orden de entrada**, solo del valor del string.

## Consumidor

- [server/src/parsing/normalizeNesting.js:43](../server/src/parsing/normalizeNesting.js#L43) lo invoca al armar el JSON final; el color viaja en cada `part.color`.
