// Entry-point: conecta uploader, llamada al backend, render SVG y panel de partes.
import { uploadNesting } from "./api/nestingsClient.js";
import { renderNesting, fitViewBoxToContent } from "./render/svgRenderer.js";
import { mountUploader } from "./ui/uploader.js";
import { renderPartsPanel } from "./ui/partsPanel.js";

const viewerEl = document.getElementById("viewer");
const listEl = document.getElementById("parts-list");
const slotEl = document.getElementById("uploader-slot");

mountUploader(slotEl, {
  onFile: async (file) => {
    // Mientras se procesa mostramos un mensaje sencillo para feedback inmediato.
    viewerEl.innerHTML =
      '<p style="margin:auto;color:#888">Procesando DXF...</p>';
    listEl.innerHTML = "";
    try {
      const nesting = await uploadNesting(file);
      const svg = renderNesting(nesting);
      viewerEl.innerHTML = "";
      viewerEl.appendChild(svg);
      // Reencuadre: el viewBox del backend usa la hoja completa; ya en el DOM
      // medimos el contenido real y ajustamos para llenar el espacio disponible.
      fitViewBoxToContent(svg);
      renderPartsPanel(listEl, nesting.parts, viewerEl);
    } catch (err) {
      viewerEl.innerHTML = `<p style="margin:auto;color:#c00">${err.message}</p>`;
    }
  },
});
