// Rutas de /api/destinations: lookup mock y next-route contra SQL Server.
import { Router } from 'express';
import { lookupDestinations } from '../db/lookupDestinations.js';
import { getNextRoutes } from '../db/getNextRoutes.js';

const router = Router();

// POST /api/destinations/lookup — stub mock (se mantiene hasta validar next-route).
router.post('/lookup', (req, res) => {
  const { partNumbers } = req.body || {};
  if (!Array.isArray(partNumbers)) {
    return res.status(400).json({ error: 'Body debe incluir { partNumbers: string[] }' });
  }
  res.json(lookupDestinations(partNumbers));
});

// POST /api/destinations/next-route — consulta ruta siguiente en SQL Server.
router.post('/next-route', async (req, res) => {
  const { partNumbers } = req.body || {};

  // Validacion: partNumbers debe ser un array no vacio de strings.
  if (!Array.isArray(partNumbers) || partNumbers.length === 0) {
    return res.status(400).json({ error: 'Body debe incluir { partNumbers: string[] } no vacio' });
  }
  if (!partNumbers.every((pn) => typeof pn === 'string')) {
    return res.status(400).json({ error: 'Todos los elementos de partNumbers deben ser strings' });
  }

  try {
    const result = await getNextRoutes(partNumbers);
    res.json(result);
  } catch (err) {
    console.error('[destinations] error en next-route:', err.message);
    res.status(500).json({ error: 'Error al consultar ruta siguiente', detail: err.message });
  }
});

export default router;
