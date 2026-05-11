// Convierte una entidad DXF normalizada en un elemento SVG.
// Trabaja en coordenadas DXF (Y arriba); el flip se aplica en el grupo raiz del renderer.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Construye el atributo "d" de un arco usando el comando A de SVG.
// startAngle/endAngle vienen en RADIANES desde dxf-parser, sentido antihorario desde +X.
function arcToPathD(cx, cy, r, startRad, endRad) {
  // Aseguramos que el barrido vaya de start a end en sentido antihorario (positivo).
  const TAU = Math.PI * 2;
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

export function entityToSvg(entity) {
  if (entity.type === 'LINE') {
    const el = document.createElementNS(SVG_NS, 'line');
    el.setAttribute('x1', entity.x1);
    el.setAttribute('y1', entity.y1);
    el.setAttribute('x2', entity.x2);
    el.setAttribute('y2', entity.y2);
    return el;
  }
  if (entity.type === 'CIRCLE') {
    const el = document.createElementNS(SVG_NS, 'circle');
    el.setAttribute('cx', entity.cx);
    el.setAttribute('cy', entity.cy);
    el.setAttribute('r', entity.r);
    el.setAttribute('fill', 'none');
    return el;
  }
  if (entity.type === 'ARC') {
    const el = document.createElementNS(SVG_NS, 'path');
    el.setAttribute('d', arcToPathD(entity.cx, entity.cy, entity.r, entity.startAngle, entity.endAngle));
    el.setAttribute('fill', 'none');
    return el;
  }
  return null;
}
