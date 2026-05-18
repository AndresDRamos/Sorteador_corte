// Clasifica los loops cerrados de una pieza como contorno exterior o hueco
// segun su profundidad de anidamiento (paridad: par=outer, impar=hole).
// Robusto frente a DXFs con direcciones inconsistentes: no depende del winding.
import {
  flattenLoop,
  loopBBox,
  pointInPolygon,
} from "../geometry/loopGeometry.js";

// Pre-filtro rapido: bbox A contiene bbox B (estrictamente, con tolerancia minima).
function bboxContains(a, b) {
  return (
    a.minX <= b.minX &&
    a.minY <= b.minY &&
    a.maxX >= b.maxX &&
    a.maxY >= b.maxY
  );
}

// Devuelve un punto representativo del poligono (primer vertice).
// Es suficiente porque el ray-cast solo necesita un punto interior bien definido,
// y la frontera de A no toca el interior de B (los loops vienen de bordes distintos).
function representativePoint(points) {
  return points[0];
}

// Recibe los loops de una pieza y devuelve un nuevo arreglo donde cada loop cerrado
// trae role ('outer' | 'hole') y depth (numero de loops que lo contienen).
// Los loops abiertos se etiquetan como role: 'open' y depth: null.
export function classifyLoops(loops) {
  // Pre-procesa cada loop cerrado: muestreo poligonal + bbox + punto representativo.
  const enriched = loops.map((loop) => {
    if (!loop.closed) return { loop, closed: false };
    const points = flattenLoop(loop);
    const bbox = loopBBox(points);
    return {
      loop,
      closed: true,
      points,
      bbox,
      sample: representativePoint(points),
    };
  });

  // Para cada loop cerrado, cuenta cuantos OTROS loops cerrados lo contienen.
  // Pre-filtro por bbox para evitar tests innecesarios; despues point-in-polygon real.
  return enriched.map((item) => {
    if (!item.closed) {
      return { ...item.loop, role: "open", depth: null };
    }
    let depth = 0;
    for (const other of enriched) {
      if (other === item || !other.closed) continue;
      if (!bboxContains(other.bbox, item.bbox)) continue;
      if (pointInPolygon(item.sample, other.points)) depth++;
    }
    return {
      ...item.loop,
      role: depth % 2 === 0 ? "outer" : "hole",
      depth,
      // bbox local del loop (coords DXF del bloque); el frontend lo usa para ordenar
      // instancias por tamano y asi pintar piezas grandes antes que las chicas.
      bbox: item.bbox,
    };
  });
}
