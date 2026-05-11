// Stub de la futura consulta a BD: devuelve un destino mock por numero de parte.
// La firma se mantendra estable cuando se conecte a la BD real (mismo input/output).
export function lookupDestinations(partNumbers) {
  // Distribuimos los part-numbers entre 3 destinos mock de forma deterministica.
  const DESTS = ['MOCK-DEST-A', 'MOCK-DEST-B', 'MOCK-DEST-C'];
  const result = {};
  for (const pn of partNumbers) {
    // Suma simple de char codes para escoger destino estable.
    let sum = 0;
    for (let i = 0; i < pn.length; i++) sum += pn.charCodeAt(i);
    result[pn] = { destination: DESTS[sum % DESTS.length] };
  }
  return result;
}
