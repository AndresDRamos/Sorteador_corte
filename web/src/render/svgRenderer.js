// Construye el SVG completo del nesteo a partir del JSON normalizado del backend.
import { buildViewBox } from './viewBox.js';
import { entityToSvg, loopToPathD } from './entityToPath.js';

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
  // fill-rule evenodd permite que loops anidados (agujeros) queden transparentes.
  g.setAttribute('fill-rule', 'evenodd');

  if (part.loops && part.loops.length > 0) {
    // Render por loops: cerrados con relleno, abiertos solo stroke.
    for (const loop of part.loops) {
      const d = loopToPathD(loop);
      if (!d) continue;
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', d);
      if (loop.closed) {
        path.setAttribute('fill', part.color);
        path.setAttribute('fill-opacity', '0.75');
      } else {
        path.setAttribute('fill', 'none');
      }
      g.appendChild(path);
    }
  } else {
    // Fallback: entidades sueltas si no hay loops construidos.
    g.setAttribute('fill', 'none');
    for (const e of part.entities) {
      const el = entityToSvg(e);
      if (el) g.appendChild(el);
    }
  }

  return g;
}

// Ajusta el viewBox al bbox real del contenido renderizado.
// Debe llamarse DESPUES de insertar el <svg> en el DOM (getBBox requiere layout).
// Motivo: el viewBox inicial usa los bounds del header DXF, que describen la HOJA
// completa de corte, no el nesteo real. El nesteo suele ocupar una fraccion de la hoja
// y queda diminuto en una esquina. Aqui medimos el contenido ya en pantalla y lo
// reencuadramos para que llene el viewer.
export function fitViewBoxToContent(svg, paddingRatio = 0.04) {
  // El primer <g> hijo es el "root" con scale(1 -1) ya aplicado: medimos ahi
  // para obtener coordenadas en el sistema final del SVG.
  const root = svg.querySelector(':scope > g');
  if (!root) return;
  let bbox;
  try {
    bbox = root.getBBox();
  } catch {
    // getBBox falla si el svg no esta en el DOM o esta vacio; abortamos sin tocar viewBox.
    return;
  }
  if (!bbox || (bbox.width === 0 && bbox.height === 0)) return;
  // Padding proporcional al lado mayor para que el nesteo no toque los bordes del viewer.
  const pad = Math.max(bbox.width, bbox.height) * paddingRatio;
  // getBBox sobre root devuelve coords en el espacio LOCAL del grupo (DXF, Y arriba).
  // El viewBox del <svg> vive en el espacio POST-flip (tras scale(1,-1)): un punto
  // (x, y) DXF aparece en (x, -y) SVG. Por eso convertimos: el limite superior del
  // bbox en SVG es -(bbox.y + bbox.height).
  const vbX = bbox.x - pad;
  const vbY = -(bbox.y + bbox.height) - pad;
  const vbW = bbox.width + pad * 2;
  const vbH = bbox.height + pad * 2;
  // Logs de depuracion: tamano del viewer y del contenido para diagnosticar encuadre.
  const rect = svg.getBoundingClientRect();
  console.log('[fitViewBox] viewer pixels:', { width: rect.width, height: rect.height });
  console.log('[fitViewBox] content bbox (DXF space):', { x: bbox.x, y: bbox.y, w: bbox.width, h: bbox.height });
  console.log('[fitViewBox] viewBox (SVG space):', { vbX, vbY, vbW, vbH });
  svg.setAttribute('viewBox', `${vbX} ${vbY} ${vbW} ${vbH}`);
  // Recalculamos stroke-width segun el nuevo tamano real para que el contorno siga visible.
  const sw = Math.max(vbW, vbH) * 0.0008;
  root.setAttribute('stroke-width', sw);
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

  return svg;
}
