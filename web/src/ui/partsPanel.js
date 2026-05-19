// Renderiza tarjetas agrupadas por proceso siguiente y maneja el highlight bidireccional con el SVG.

export function renderPartsPanel(listEl, parts, viewerEl) {
  listEl.innerHTML = '';

  // Agrupamos por proceso siguiente. El color es el mismo para todas las partes del grupo,
  // asi que basta tomarlo de la primera parte que cae en cada bucket.
  const groups = new Map();
  for (const part of parts) {
    const key = part.nextProcess;
    if (!groups.has(key)) groups.set(key, { color: part.color, parts: [] });
    groups.get(key).parts.push(part);
  }

  // Orden alfabetico estable: el operador encuentra cada grupo siempre en el mismo lugar.
  const sortedGroups = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [groupName, { color, parts: groupParts }] of sortedGroups) {
    const card = document.createElement('article');
    card.className = 'group-card';
    card.style.setProperty('--group-color', color);

    const header = document.createElement('header');
    header.className = 'group-header';
    header.innerHTML = `
      <span class="swatch"></span>
      <span class="group-name" title="${groupName}">${groupName}</span>
      <span class="group-count">${groupParts.length}</span>
    `;
    card.appendChild(header);

    const ul = document.createElement('ul');
    ul.className = 'group-parts';
    const sortedParts = [...groupParts].sort((a, b) => a.partNumber.localeCompare(b.partNumber));
    for (const part of sortedParts) {
      const li = document.createElement('li');
      li.dataset.part = part.partNumber;
      li.innerHTML = `
        <span class="pn">${part.partNumber}</span>
        <span class="count">${part.count}</span>
      `;
      li.addEventListener('mouseenter', () => highlight(viewerEl, part.partNumber, true));
      li.addEventListener('mouseleave', () => highlight(viewerEl, part.partNumber, false));
      ul.appendChild(li);
    }
    card.appendChild(ul);

    listEl.appendChild(card);
  }
}

// Aplica/retira la clase .highlight a los <g data-part="..."> coincidentes y al <li> del panel.
function highlight(viewerEl, partNumber, on) {
  const svg = viewerEl.querySelector('svg');
  if (!svg) return;
  svg.classList.toggle('has-highlight', on);
  for (const g of svg.querySelectorAll(`g[data-part="${CSS.escape(partNumber)}"]`)) {
    g.classList.toggle('highlight', on);
  }
}
