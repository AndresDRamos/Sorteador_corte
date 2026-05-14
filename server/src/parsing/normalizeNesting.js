// Combina geometria, instancias y colores en el JSON estable que consume el frontend.
import { assignColors } from "../colors/assignColors.js";
import { buildLoops } from "./buildLoops.js";

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

export function normalizeNesting(parsed, extracted) {
  const { partDefinitions, instances, countByPart } = extracted;

  // Asignacion de color por numero de parte (estable entre cargas).
  const partNumbers = Array.from(partDefinitions.keys());
  const colors = assignColors(partNumbers);

  // Estructura "parts": geometria + color + conteo de instancias + loops por pieza.
  const parts = partNumbers.map((pn) => ({
    partNumber: pn,
    color: colors.get(pn),
    count: countByPart.get(pn) || 0,
    entities: partDefinitions.get(pn).entities,
    loops: buildLoops(partDefinitions.get(pn).entities),
  }));

  const bounds =
    readBoundsFromHeader(parsed.header) ||
    computeBoundsFromInstances(instances);

  return {
    bounds,
    parts,
    instances,
  };
}
