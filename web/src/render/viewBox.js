// Calcula el viewBox SVG aplicando flip vertical (DXF: Y arriba; SVG: Y abajo).
// La estrategia es renderizar todo en el sistema DXF y aplicar transform="scale(1,-1)"
// al grupo raiz; el viewBox debe expresarse entonces en coordenadas DXF negadas en Y.

export function buildViewBox(bounds) {
  const [minX, minY] = bounds.min;
  const [maxX, maxY] = bounds.max;
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  // Margen 2% para que las piezas pegadas al borde no queden cortadas.
  const pad = Math.max(width, height) * 0.02;
  // Tras el flip vertical, Y se vuelve negativa: el rango util va de -maxY a -minY.
  const vbX = minX - pad;
  const vbY = -maxY - pad;
  const vbW = width + pad * 2;
  const vbH = height + pad * 2;
  return `${vbX} ${vbY} ${vbW} ${vbH}`;
}
