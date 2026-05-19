// Asigna un color a cada clave de grupo por indice ordenado.
// Garantiza colores unicos mientras haya <= PALETTE.length grupos distintos.
// Tradeoff: el color de un grupo depende del conjunto que se carga junto;
// si aparece un grupo nuevo que altera el orden alfabetico, los colores pueden reasignarse.

const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4'
];

// Devuelve un Map<groupKey, color>. Ordena las claves alfabeticamente para que
// el mismo conjunto de grupos reciba siempre la misma asignacion entre cargas.
export function assignColors(groupKeys) {
  const unique = [...new Set(groupKeys)].sort((a, b) => a.localeCompare(b));
  const map = new Map();
  for (let i = 0; i < unique.length; i++) {
    map.set(unique[i], PALETTE[i % PALETTE.length]);
  }
  return map;
}
