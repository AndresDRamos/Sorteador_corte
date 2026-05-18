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

// Devuelve los puntos start/end actuales de un loop tal como se recorre.
function loopEndpoints(loop) {
  const first = loop.entities[0];
  const last = loop.entities[loop.entities.length - 1];
  const firstPts = getEndpoints(first.entity);
  const lastPts = getEndpoints(last.entity);
  const start = first.reversed ? firstPts.end : firstPts.start;
  const end = last.reversed ? lastPts.start : lastPts.end;
  return { start, end };
}

// Invierte el orden y el flag reversed de cada entidad del loop.
function reverseLoopEntities(entities) {
  return entities
    .slice()
    .reverse()
    .map((e) => ({ entity: e.entity, reversed: !e.reversed }));
}

function pointDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Fusiona pares de loops abiertos cuyos extremos coincidan dentro de tolerancia.
// Necesario porque la indexación por pointKey usa Math.round con grilla 1e-4, y un punto
// cuya coordenada cae exactamente en X.XXXX5 puede caer en celdas distintas que un punto
// geometricamente idéntico computado por trigonometría — fragmentando el contorno.
// Tolerancia ~1e-2: cubre los errores de redondeo sin unir loops legítimamente separados
// (los detalles geométricos de las piezas están muy por encima de ese umbral).
function joinOpenLoops(loops, tol) {
  const closed = loops.filter((l) => l.closed);
  let open = loops.filter((l) => !l.closed);
  if (open.length < 2) return [...closed, ...open];

  let changed = true;
  while (changed && open.length > 0) {
    changed = false;
    outer: for (let i = 0; i < open.length; i++) {
      const a = open[i];
      const aEnds = loopEndpoints(a);
      for (let j = 0; j < open.length; j++) {
        if (i === j) continue;
        const b = open[j];
        const bEnds = loopEndpoints(b);
        if (pointDist(aEnds.end, bEnds.start) < tol) {
          a.entities.push(...b.entities);
        } else if (pointDist(aEnds.end, bEnds.end) < tol) {
          a.entities.push(...reverseLoopEntities(b.entities));
        } else if (pointDist(aEnds.start, bEnds.end) < tol) {
          a.entities.unshift(...b.entities);
        } else if (pointDist(aEnds.start, bEnds.start) < tol) {
          a.entities.unshift(...reverseLoopEntities(b.entities));
        } else {
          continue;
        }
        open.splice(j, 1);
        changed = true;
        break outer;
      }
    }
    // Marca como cerrados los loops cuyos extremos ya coinciden tras la fusión.
    for (const l of open) {
      const ends = loopEndpoints(l);
      if (pointDist(ends.start, ends.end) < tol) l.closed = true;
    }
    const justClosed = open.filter((l) => l.closed);
    closed.push(...justClosed);
    open = open.filter((l) => !l.closed);
  }
  return [...closed, ...open];
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

  return joinOpenLoops(loops, 1e-2);
}
