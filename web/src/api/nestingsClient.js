// Cliente HTTP del backend. Centraliza endpoints para no esparcir fetchs en la UI.

export async function uploadNesting(file) {
  // FormData con campo "file" porque el endpoint usa multer.single('file').
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/nestings', { method: 'POST', body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al subir DXF`);
  }
  return res.json();
}

export async function lookupDestinations(partNumbers) {
  const res = await fetch('/api/destinations/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ partNumbers }),
  });
  if (!res.ok) throw new Error(`Error ${res.status} en lookup de destinos`);
  return res.json();
}
