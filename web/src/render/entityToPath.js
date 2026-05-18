// Convierte una entidad DXF normalizada en un elemento SVG.
// Trabaja en coordenadas DXF (Y arriba); el flip se aplica en el grupo raiz del renderer.

const SVG_NS = "http://www.w3.org/2000/svg";
const TAU = Math.PI * 2;

// Construye el atributo "d" de un arco usando el comando A de SVG.
// startAngle/endAngle vienen en RADIANES desde dxf-parser, sentido antihorario desde +X.
function arcToPathD(cx, cy, r, startRad, endRad) {
  // Aseguramos que el barrido vaya de start a end en sentido antihorario (positivo).
  let sweep = endRad - startRad;
  while (sweep <= 0) sweep += TAU; // arco siempre positivo, evita arcos vacios
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(startRad + sweep);
  const y2 = cy + r * Math.sin(startRad + sweep);
  const largeArc = sweep > Math.PI ? 1 : 0;
  // sweep-flag = 1 porque el sistema DXF es antihorario; al hacer flip(1,-1) en SVG
  // el sentido visual termina coincidiendo correctamente.
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// Calcula el barrido angular positivo de startRad a endRad (antihorario, [0, 2*PI)).
function arcSpan(startRad, endRad) {
  let span = endRad - startRad;
  while (span <= 0) span += TAU;
  return span;
}

// Genera el atributo "d" de un loop completo como un unico <path>.
// Cada entidad del loop tiene { entity, reversed }.
// El path se construye en coordenadas DXF; el flip Y se aplica en el grupo raiz.
export function loopToPathD(loop) {
  if (loop.entities.length === 0) return "";

  const parts = [];

  for (let i = 0; i < loop.entities.length; i++) {
    const { entity, reversed } = loop.entities[i];

    if (entity.type === "LINE") {
      // Punto inicial: solo en la primera entidad.
      if (i === 0) {
        const sx = reversed ? entity.x2 : entity.x1;
        const sy = reversed ? entity.y2 : entity.y1;
        parts.push(`M ${sx} ${sy}`);
      }
      // Punto final de la linea.
      const ex = reversed ? entity.x1 : entity.x2;
      const ey = reversed ? entity.y1 : entity.y2;
      parts.push(`L ${ex} ${ey}`);
    } else if (entity.type === "ARC") {
      // Angulos segun direccion de recorrido.
      const startRad = reversed ? entity.endAngle : entity.startAngle;
      const endRad = reversed ? entity.startAngle : entity.endAngle;

      if (i === 0) {
        const sx = entity.cx + entity.r * Math.cos(startRad);
        const sy = entity.cy + entity.r * Math.sin(startRad);
        parts.push(`M ${sx} ${sy}`);
      }

      const ex = entity.cx + entity.r * Math.cos(endRad);
      const ey = entity.cy + entity.r * Math.sin(endRad);

      // largeArc es geometrico (corto/largo del arco) → se calcula sobre los angulos
      // DXF originales, no sobre los invertidos: arcSpan(end,start) daria TAU - span
      // y seleccionaria el arco complementario (sintoma: esquinas concavas que se ven
      // bombeadas hacia afuera).
      // sweep es direccional: reversed=true invierte el recorrido. Combinado con el
      // flip(1,-1) del grupo raiz, el sentido visual queda correcto.

      const span = arcSpan(entity.startAngle, entity.endAngle);
      const largeArc = span > Math.PI ? 1 : 0;
      const sweep = reversed ? 0 : 1;

      parts.push(
        `A ${entity.r} ${entity.r} 0 ${largeArc} ${sweep} ${ex} ${ey}`,
      );
    } else if (entity.type === "CIRCLE") {
      // Circulo completo: dos semiarcos opuestos.
      const r = entity.r;
      const cx = entity.cx;
      const cy = entity.cy;
      parts.push(`M ${cx - r} ${cy}`);
      parts.push(`A ${r} ${r} 0 1 0 ${cx + r} ${cy}`);
      parts.push(`A ${r} ${r} 0 1 0 ${cx - r} ${cy}`);
      break; // El circulo cierra el loop por si mismo.
    }
  }

  if (loop.closed) {
    parts.push("Z");
  }

  return parts.join(" ");
}

// Combina varios loops cerrados en un unico atributo "d" con subpaths M..Z M..Z.
// Critico para que fill-rule="evenodd" detecte huecos: evenodd solo opera dentro
// de un mismo <path>, no entre <path> hermanos.
export function loopsToCombinedPathD(loops) {
  const parts = [];
  for (const loop of loops) {
    if (!loop.closed) continue;
    const d = loopToPathD(loop);
    if (d) parts.push(d);
  }
  return parts.join(" ");
}

export function entityToSvg(entity) {
  if (entity.type === "LINE") {
    const el = document.createElementNS(SVG_NS, "line");
    el.setAttribute("x1", entity.x1);
    el.setAttribute("y1", entity.y1);
    el.setAttribute("x2", entity.x2);
    el.setAttribute("y2", entity.y2);
    return el;
  }
  if (entity.type === "CIRCLE") {
    const el = document.createElementNS(SVG_NS, "circle");
    el.setAttribute("cx", entity.cx);
    el.setAttribute("cy", entity.cy);
    el.setAttribute("r", entity.r);
    el.setAttribute("fill", "none");
    return el;
  }
  if (entity.type === "ARC") {
    const el = document.createElementNS(SVG_NS, "path");
    el.setAttribute(
      "d",
      arcToPathD(
        entity.cx,
        entity.cy,
        entity.r,
        entity.startAngle,
        entity.endAngle,
      ),
    );
    el.setAttribute("fill", "none");
    return el;
  }
  return null;
}
