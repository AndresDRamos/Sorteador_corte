// Reconstruye loops cerrados (contornos) a partir de entidades sueltas (LINE, ARC, CIRCLE).
// Las entidades se unen por extremos coincidentes dentro de una tolerancia epsilon.
// Cada CIRCLE ya es un loop cerrado por si mismo.

const EPSILON = 1e-4;
// Factor de redondeo para construir claves de punto en el indice.
const PRECISION = 1 / EPSILON;

// Redondea coordenada a la grilla de tolerancia para comparaciones.
function roundCoord(v) {
  return Math.round(v * PRECISION) / PRECISION;
}

// Genera una clave unica a partir de un punto (x, y).
function pointKey(x, y) {
  return `${roundCoord(x)},${roundCoord(y)}`;
}

// Obtiene los puntos inicial y final de una entidad (LINE o ARC).
// CIRCLE no tiene extremos; se maneja aparte.
function getEndpoints(entity) {
  if (entity.type === 'LINE') {
    return {
      start: { x: entity.x1, y: entity.y1 },
      end: { x: entity.x2, y: entity.y2 },
    };
  }
  if (entity.type === 'ARC') {
    return {
      start: {
        x: entity.cx + entity.r * Math.cos(entity.startAngle),
        y: entity.cy + entity.r * Math.sin(entity.startAngle),
      },
      end: {
        x: entity.cx + entity.r * Math.cos(entity.endAngle),
        y: entity.cy + entity.r * Math.sin(entity.endAngle),
      },
    };
  }
  return null;
}

// Construye loops a partir de un array de entidades.
// Devuelve Array<{ entities: Array<{ entity, reversed }>, closed: boolean }>.
export function buildLoops(entities) {
  // Separar CIRCLEs (loops cerrados por si mismos) del resto.
  const circles = [];
  const others = [];
  for (const e of entities) {
    if (e.type === 'CIRCLE') {
      circles.push(e);
    } else {
      others.push(e);
    }
  }

  const loops = [];

  // Cada CIRCLE es un loop cerrado independiente.
  for (const c of circles) {
    loops.push({ entities: [{ entity: c, reversed: false }], closed: true });
  }

  // Si no hay entidades no-circulo, devolver solo los circulos.
  if (others.length === 0) return loops;

  // Indice de extremos: clave de punto → lista de { entityIndex, which: 'start'|'end' }.
  const pointIndex = new Map();
  for (let i = 0; i < others.length; i++) {
    const pts = getEndpoints(others[i]);
    if (!pts) continue;
    const sk = pointKey(pts.start.x, pts.start.y);
    const ek = pointKey(pts.end.x, pts.end.y);
    if (!pointIndex.has(sk)) pointIndex.set(sk, []);
    pointIndex.get(sk).push({ entityIndex: i, which: 'start' });
    if (!pointIndex.has(ek)) pointIndex.set(ek, []);
    pointIndex.get(ek).push({ entityIndex: i, which: 'end' });
  }

  const visited = new Set();

  // Recorre la cadena de entidades conectadas para formar cada loop.
  for (let i = 0; i < others.length; i++) {
    if (visited.has(i)) continue;

    const firstPts = getEndpoints(others[i]);
    if (!firstPts) continue;

    const loop = [];
    loop.push({ entity: others[i], reversed: false });
    visited.add(i);

    let currentEnd = firstPts.end;
    let closed = false;

    // Sigue conectando por el extremo libre hasta cerrar o agotar conexiones.
    while (true) {
      const key = pointKey(currentEnd.x, currentEnd.y);
      const candidates = pointIndex.get(key) || [];

      // Buscar una entidad no visitada que comparta este extremo.
      let next = null;
      let nextReversed = false;
      for (const c of candidates) {
        if (visited.has(c.entityIndex)) continue;
        // Si conecta por 'start' → se recorre normal; si conecta por 'end' → se recorre invertida.
        next = c.entityIndex;
        nextReversed = c.which === 'end';
        break;
      }

      if (next === null) {
        // Sin mas conexiones: verificar si el extremo actual coincide con el inicio del loop.
        const startKey = pointKey(firstPts.start.x, firstPts.start.y);
        closed = key === startKey;
        break;
      }

      const nextPts = getEndpoints(others[next]);
      loop.push({ entity: others[next], reversed: nextReversed });
      visited.add(next);

      // El extremo libre del siguiente es el opuesto al que conectamos.
      currentEnd = nextReversed ? nextPts.start : nextPts.end;

      // Verificar si el loop se cerro.
      const startKey = pointKey(firstPts.start.x, firstPts.start.y);
      if (pointKey(currentEnd.x, currentEnd.y) === startKey) {
        closed = true;
        break;
      }
    }

    loops.push({ entities: loop, closed });
  }

  return loops;
}
