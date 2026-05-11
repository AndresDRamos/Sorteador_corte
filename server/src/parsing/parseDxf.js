// Wrapper minimo sobre dxf-parser. Aisla la dependencia para poder sustituirla en el futuro.
import DxfParser from 'dxf-parser';

// Recibe un Buffer (lo que entrega multer) y devuelve el JSON crudo del parser.
export function parseDxfBuffer(buffer) {
  const parser = new DxfParser();
  // dxf-parser espera string UTF-8; los DXF ASCII suelen venir en ese encoding o en latin-1.
  // Para esta version asumimos UTF-8/ASCII puro segun los archivos de muestra.
  const text = buffer.toString('utf8');
  return parser.parseSync(text);
}
