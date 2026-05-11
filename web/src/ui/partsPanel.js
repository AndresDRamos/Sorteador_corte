// Renderiza la lista lateral de partes y maneja el highlight bidireccional con el SVG.

export function renderPartsPanel(listEl, parts, viewerEl) {
  listEl.innerHTML = '';
  // Orden alfabetico estable para que el panel sea predecible al recargar.
  const sorted = [...parts].sort((a, b) => a.partNumber.localeCompare(b.partNumber));

  for (const part of sorted) {
    const li = document.createElement('li');
    li.dataset.part = part.partNumber;
    li.innerHTML = `
      <span class="swatch" style="background:${part.color}"></span>
      <span class="pn">${part.partNumber}</span>
      <span class="count">${part.count}</span>
    `;

    li.addEventListener('mouseenter', () => highlight(viewerEl, part.partNumber, true));
    li.addEventListener('mouseleave', () => highlight(viewerEl, part.partNumber, false));
    listEl.appendChild(li);
  }
}

// Aplica/retira la clase .highlight a los <g data-part="..."> coincidentes.
function highlight(viewerEl, partNumber, on) {
  const svg = viewerEl.querySelector('svg');
  if (!svg) return;
  svg.classList.toggle('has-highlight', on);
  for (const g of svg.querySelectorAll(`g[data-part="${CSS.escape(partNumber)}"]`)) {
    g.classList.toggle('highlight', on);
  }
}
