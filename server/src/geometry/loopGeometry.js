// Utilidades geometricas sobre loops reconstruidos por buildLoops.
// Trabaja en coordenadas DXF (Y arriba); no aplica flips.

const TAU = Math.PI * 2;

// Calcula el barrido angular positivo de startRad a endRad (antihorario, (0, 2*PI]).
// Mismo criterio que entityToPath.js: garantiza arcos no vacios.
function arcSpan(startRad, endRad) {
  let span = endRad - startRad;
  while (span <= 0) span += TAU;
  return span;
}

// Muestrea un loop como un poligono cerrado de puntos [x, y].
// LINE → un par de puntos; ARC → segPerArc + 1 puntos; CIRCLE → segPerCircle puntos.
// Respeta el flag reversed que ya viene de buildLoops.
export function flattenLoop(loop, segPerArc = 24, segPerCircle = 48) {
  const points = [];

  // Helper: agrega punto evitando duplicar el ultimo (los extremos compartidos entre
  // entidades del loop coinciden por construccion de buildLoops).
  const pushPoint = (x, y) => {
    const last = points[points.length - 1];
    if (last && last[0] === x && last[1] === y) return;
    points.push([x, y]);
  };

  for (let i = 0; i < loop.entities.length; i++) {
    const { entity, reversed } = loop.entities[i];

    if (entity.type === "LINE") {
      const sx = reversed ? entity.x2 : entity.x1;
      const sy = reversed ? entity.y2 : entity.y1;
      const ex = reversed ? entity.x1 : entity.x2;
      const ey = reversed ? entity.y1 : entity.y2;
      if (i === 0) pushPoint(sx, sy);
      pushPoint(ex, ey);
    } else if (entity.type === "ARC") {
      // El arco DXF va antihorario de startAngle a endAngle; si reversed, lo recorremos al reves.
      const span = arcSpan(entity.startAngle, entity.endAngle);
      const dir = reversed ? -1 : 1;
      const a0 = reversed ? entity.endAngle : entity.startAngle;
      // Muestreo uniforme; el primer punto solo se agrega si es la primera entidad del loop.
      if (i === 0) {
        pushPoint(
          entity.cx + entity.r * Math.cos(a0),
          entity.cy + entity.r * Math.sin(a0),
        );
      }
      for (let k = 1; k <= segPerArc; k++) {
        const t = (k / segPerArc) * span * dir;
        const a = a0 + t;
        pushPoint(
          entity.cx + entity.r * Math.cos(a),
          entity.cy + entity.r * Math.sin(a),
        );
      }
    } else if (entity.type === "CIRCLE") {
      // Circulo completo: muestreo uniforme antihorario; cierra el loop por si solo.
      for (let k = 0; k < segPerCircle; k++) {
        const a = (k / segPerCircle) * TAU;
        pushPoint(
          entity.cx + entity.r * Math.cos(a),
          entity.cy + entity.r * Math.sin(a),
        );
      }
      // No agregamos mas entidades despues de un CIRCLE: el loop ya esta cerrado.
      break;
    }
  }

  return points;
}

// Bounding box [minX, minY, maxX, maxY] a partir de un poligono muestreado.
export function loopBBox(points) {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

// Test ray-cast horizontal estandar: cuenta cruces de una semirecta desde p a +X.
// Devuelve true si el punto esta dentro del poligono cerrado.
export function pointInPolygon(p, points) {
  const [px, py] = p;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    // Cruce con la arista (j, i) a la altura py.
    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi + 0) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Area con signo (shoelace). Positiva → antihorario en sistema con Y arriba.
// Util como desempate cuando dos loops tienen bbox identico.
export function signedArea(points) {
  let s = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    s += (points[j][0] + points[i][0]) * (points[i][1] - points[j][1]);
  }
  return s / 2;
}
