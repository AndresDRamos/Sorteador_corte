// Monta el control de subida de DXF en el slot indicado.
// Notifica al caller con el File seleccionado mediante onFile(file).

export function mountUploader(slot, { onFile }) {
  const wrap = document.createElement('label');
  wrap.className = 'uploader';
  wrap.innerHTML = '<span>Subir DXF</span>';

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.dxf';
  // Estilo minimo: input oculto, label clickeable.
  input.style.marginLeft = '0.5rem';

  input.addEventListener('change', () => {
    const f = input.files?.[0];
    if (f) onFile(f);
    // Reset para permitir re-subir el mismo archivo y re-disparar el evento.
    input.value = '';
  });

  wrap.appendChild(input);
  slot.appendChild(wrap);
}
