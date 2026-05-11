// POST /api/nestings: recibe un DXF, lo parsea y devuelve el JSON normalizado.
import { Router } from 'express';
import multer from 'multer';
import { parseDxfBuffer } from '../parsing/parseDxf.js';
import { extractParts } from '../parsing/extractParts.js';
import { normalizeNesting } from '../parsing/normalizeNesting.js';

const router = Router();
// Almacenamiento en memoria; el archivo se procesa y descarta en la misma request.
// Limite de 20MB para cubrir nesteos grandes sin abrir DoS.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Falta el campo "file" (archivo DXF).' });
  }
  try {
    const parsed = parseDxfBuffer(req.file.buffer);
    const extracted = extractParts(parsed);
    const nesting = normalizeNesting(parsed, extracted);
    res.json(nesting);
  } catch (err) {
    // Errores tipicos: DXF malformado, version no soportada por dxf-parser.
    console.error('[nestings] error parseando DXF:', err);
    res.status(422).json({ error: 'No se pudo parsear el archivo DXF.', detail: err.message });
  }
});

export default router;
