// POST /api/destinations/lookup: stub que mapea part-numbers a destinos mock.
import { Router } from 'express';
import { lookupDestinations } from '../db/lookupDestinations.js';

const router = Router();

router.post('/lookup', (req, res) => {
  const { partNumbers } = req.body || {};
  if (!Array.isArray(partNumbers)) {
    return res.status(400).json({ error: 'Body debe incluir { partNumbers: string[] }' });
  }
  res.json(lookupDestinations(partNumbers));
});

export default router;
