# Asignación de colores

> **Cubre:** [server/src/colors/](../server/src/colors/)
> **Router:** `AGENTS.md → Asignación de colores`

## Propósito

Asigna un color hex estable a cada **grupo de proceso siguiente** usando un hash determinista. Las piezas que comparten destino comparten color, lo que permite al operador identificar visualmente hacia dónde va cada pieza en el nesteo. Piezas sin proceso siguiente en la BD caen al grupo `Almacén Kiteo`.

## API pública

- `assignColors(groupKeys)` — [server/src/colors/assignColors.js:23](../server/src/colors/assignColors.js#L23). Recibe un iterable de claves de grupo (procesos siguientes) y devuelve `Map<groupKey, color>`.

## Conceptos clave

- **Paleta fija de 20 colores** con buen contraste sobre fondo claro (basada en Kelly / Sasha Trubetskoy) — [assignColors.js:5-10](../server/src/colors/assignColors.js#L5-L10).
- **Hash djb2** sobre el string del grupo, módulo `PALETTE.length` ([assignColors.js:13](../server/src/colors/assignColors.js#L13)).
- **Colisiones:** con más de 20 grupos distintos habrá colores repetidos por diseño. La estabilidad entre cargas pesa más que la unicidad.
- **Grupo por defecto:** `Almacén Kiteo` para part-numbers cuyo `nextProcess` venga `null` desde [getNextProcess](../server/src/db/getNextProcess.js).
- **No depende del orden de entrada**, solo del valor del string del grupo.

## Consumidor

- [server/src/parsing/normalizeNesting.js](../server/src/parsing/normalizeNesting.js) consulta `getNextProcess`, arma `groupByPart` (part → proceso siguiente, con fallback al grupo por defecto) y pasa las claves de grupo a `assignColors`. Cada `part` del JSON resultante incluye `nextProcess` y `color`.
