// Construye el SVG completo del nesteo a partir del JSON normalizado del backend.
import { buildViewBox } from './viewBox.js';
import { entityToSvg } from './entityToPath.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

// Crea el <g> que representa una instancia (INSERT) aplicando translate/rotate/scale DXF.
// La transformacion DXF de un INSERT es: traslada, luego rota, luego escala (alrededor del origen del block).
function buildInstanceGroup(part, instance) {
  const g = document.createElementNS(SVG_NS, 'g');
  // SVG aplica transforms de izquierda a derecha sobre el sistema local: T -> R -> S
  // coincide con la semantica DXF.
  const tr = `translate(${instance.x} ${instance.y}) rotate(${instance.rot}) scale(${instance.sx} ${instance.sy})`;
  g.setAttribute('transform', tr);
  g.setAttribute('data-part', part.partNumber);
  g.setAttribute('stroke', part.color);
  g.setAttribute('fill', 'none');
  for (const e of part.entities) {
    const el = entityToSvg(e);
    if (el) g.appendChild(el);
  }
  return g;
}

// Render principal. Devuelve el <svg> listo para insertarse en el DOM.
export function renderNesting(nesting) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', buildViewBox(nesting.bounds));
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  // stroke-width como porcentaje del lado mayor para que el grosor sea visible a cualquier escala.
  const [minX, minY] = nesting.bounds.min;
  const [maxX, maxY] = nesting.bounds.max;
  const sw = Math.max(maxX - minX, maxY - minY) * 0.0008;

  // Grupo raiz con flip vertical: convierte el sistema DXF (Y+arriba) al SVG (Y+abajo).
  const root = document.createElementNS(SVG_NS, 'g');
  root.setAttribute('transform', 'scale(1 -1)');
  root.setAttribute('stroke-width', sw);
  root.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(root);

  // Indice rapido de piezas para resolver instancias.
  const partsByNumber = new Map(nesting.parts.map((p) => [p.partNumber, p]));

  // Render de instancias de piezas reales.
  for (const inst of nesting.instances) {
    const part = partsByNumber.get(inst.partNumber);
    if (!part) continue;
    root.appendChild(buildInstanceGroup(part, inst));
  }

  // Datums al final, en gris (CSS via clase .datums).
  if (nesting.datums?.length) {
    const datumsGroup = document.createElementNS(SVG_NS, 'g');
    datumsGroup.setAttribute('class', 'datums');
    datumsGroup.setAttribute('fill', 'none');
    for (const d of nesting.datums) {
      const g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('transform', `translate(${d.x} ${d.y}) rotate(${d.rot}) scale(${d.sx} ${d.sy})`);
      for (const e of d.entities) {
        const el = entityToSvg(e);
        if (el) g.appendChild(el);
      }
      datumsGroup.appendChild(g);
    }
    root.appendChild(datumsGroup);
  }

  return svg;
}
