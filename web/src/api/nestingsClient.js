// Cliente HTTP del backend. Centraliza endpoints para no esparcir fetchs en la UI.

export async function uploadNesting(file) {
  // FormData con campo "file" porque el endpoint usa multer.single('file').
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/nestings", { method: "POST", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Error ${res.status} al subir DXF`);
  }
  return res.json();
}
// Consulta la ruta siguiente de los part-numbers contra el endpoint real de SQL Server.
export async function fetchNextProcess(partNumbers) {
  const res = await fetch("/api/nextProcess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ partNumbers }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error || `Error ${res.status} al consultar ruta siguiente`,
    );
  }
  return res.json();
}
