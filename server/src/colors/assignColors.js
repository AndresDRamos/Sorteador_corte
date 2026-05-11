// Asigna un color estable a cada numero de parte usando un hash determinista.
// Asi un mismo part-number recibe el mismo color entre cargas distintas.

// Paleta de 20 colores con buen contraste sobre fondo claro (basada en Kelly/Sasha Trubetskoy).
const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#9a6324', '#800000', '#808000',
  '#469990', '#000075', '#e6beff', '#aaffc3', '#fabebe',
  '#ffd8b1', '#fffac8', '#bfef45', '#a9a9a9', '#000000',
];

// Hash djb2 simple sobre el string (suficiente para distribuir N partes en la paleta).
function hashString(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) + str.charCodeAt(i); // h * 33 + c
    h = h | 0; // forzar entero 32-bit
  }
  return Math.abs(h);
}

// Devuelve un Map<partNumber, color>.
export function assignColors(partNumbers) {
  const map = new Map();
  for (const pn of partNumbers) {
    const idx = hashString(pn) % PALETTE.length;
    map.set(pn, PALETTE[idx]);
  }
  return map;
}
