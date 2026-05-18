# Asignación de colores

> **Cubre:** [server/src/colors/](../server/src/colors/)
> **Router:** `AGENTS.md → Asignación de colores`

## Propósito

Asigna un color hex a cada **grupo de proceso siguiente** por **índice ordenado alfabéticamente**. Las piezas que comparten destino comparten color, lo que permite al operador identificar visualmente hacia dónde va cada pieza en el nesteo. Piezas sin proceso siguiente en la BD caen al grupo `Almacén Kiteo`.

## API pública

- `assignColors(groupKeys)` — [server/src/colors/assignColors.js](../server/src/colors/assignColors.js). Recibe un iterable de claves de grupo (procesos siguientes) y devuelve `Map<groupKey, color>`.

## Conceptos clave

- **Paleta de alto contraste** (actualmente 5 colores) — [assignColors.js:7](../server/src/colors/assignColors.js#L7). Pensada para que el operador distinga grupos a primera vista.
- **Asignación por índice ordenado:** las claves se deduplican, se ordenan alfabéticamente y se asignan `PALETTE[0], PALETTE[1], ...` ([assignColors.js](../server/src/colors/assignColors.js)). Garantiza **colores únicos** mientras haya `≤ PALETTE.length` grupos distintos.
- **Por qué no hash:** una versión previa usaba `djb2 % PALETTE.length`. Con paletas chicas el módulo colisiona mucho (con 5 colores y 4 grupos, ≈ 81% de probabilidad de colisión). El índice ordenado elimina las colisiones determinísticamente.
- **Tradeoff de estabilidad:** la asignación es estable **para el mismo conjunto** de grupos cargados juntos; si aparece un grupo nuevo que altera el orden alfabético, los colores de los demás pueden reasignarse. La unicidad pesó más que la estabilidad entre cargas con conjuntos distintos.
- **Saturación:** si hay más grupos que colores, `PALETTE[i % PALETTE.length]` recicla — colores repetidos por diseño.
- **Grupo por defecto:** `Almacén Kiteo` para part-numbers cuyo `nextProcess` venga `null` desde [getNextProcess](../server/src/db/getNextProcess.js).

## Consumidor

- [server/src/parsing/normalizeNesting.js](../server/src/parsing/normalizeNesting.js) consulta `getNextProcess`, arma `groupByPart` (part → proceso siguiente, con fallback al grupo por defecto) y pasa las claves de grupo a `assignColors`. Cada `part` del JSON resultante incluye `nextProcess` y `color`.
