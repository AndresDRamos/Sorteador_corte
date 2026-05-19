// Combina geometria, instancias y colores en el JSON estable que consume el frontend.
import { assignColors } from "../colors/assignColors.js";
import { getNextProcess } from "../db/getNextProcess.js";
import { buildLoops } from "./buildLoops.js";
import { classifyLoops } from "./classifyLoops.js";

// Grupo por defecto cuando la BD no devuelve proceso siguiente para un part-number.
const DEFAULT_GROUP = "Almacén Kiteo";

// Calcula bounding box recorriendo INSERTs cuando $EXTMIN/$EXTMAX no estan disponibles.
function computeBoundsFromInstances(instances) {
  if (instances.length === 0) {
    return { min: [0, 0], max: [100, 100] };
  }
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const i of instances) {
    if (i.x < minX) minX = i.x;
    if (i.y < minY) minY = i.y;
    if (i.x > maxX) maxX = i.x;
    if (i.y > maxY) maxY = i.y;
  }
  return { min: [minX, minY], max: [maxX, maxY] };
}

// Lee bounds desde el header del DXF (mas barato y exacto que recalcular).
function readBoundsFromHeader(header) {
  const ext =
    header?.$EXTMIN && header?.$EXTMAX
      ? { min: header.$EXTMIN, max: header.$EXTMAX }
      : null;
  const lim =
    header?.$LIMMIN && header?.$LIMMAX
      ? { min: header.$LIMMIN, max: header.$LIMMAX }
      : null;
  const src = ext || lim;
  if (!src) return null;
  return { min: [src.min.x, src.min.y], max: [src.max.x, src.max.y] };
}

export async function normalizeNesting(parsed, extracted) {
  const { partDefinitions, instances, countByPart } = extracted;

  // Resolvemos el proceso siguiente para agrupar piezas por destino.
  // Si la BD no devuelve ruta para una pieza, cae al grupo por defecto.
  const partNumbers = Array.from(partDefinitions.keys());
  const nextProcessMap =
    partNumbers.length > 0 ? await getNextProcess(partNumbers) : {};
  const groupByPart = new Map(
    partNumbers.map((pn) => [
      pn,
      nextProcessMap[pn]?.nextProcess || DEFAULT_GROUP,
    ]),
  );
  // Color por grupo (no por part-number): partes que comparten proceso siguiente
  // comparten color, lo que permite al operador identificar destinos visualmente.
  const colors = assignColors(groupByPart.values());

  // Estructura "parts": geometria + color de grupo + conteo de instancias + loops por pieza.
  const parts = partNumbers.map((pn) => {
    const group = groupByPart.get(pn);
    return {
      partNumber: pn,
      nextProcess: group,
      color: colors.get(group),
      count: countByPart.get(pn) || 0,
      entities: partDefinitions.get(pn).entities,
      // Loops cerrados clasificados por contencion (role: outer|hole, depth: N).
      // Permite que el frontend combine subpaths con fill-rule evenodd y renderice huecos reales.
      loops: classifyLoops(buildLoops(partDefinitions.get(pn).entities)),
    };
  });

  const bounds =
    readBoundsFromHeader(parsed.header) ||
    computeBoundsFromInstances(instances);

  return {
    bounds,
    parts,
    instances,
  };
}
