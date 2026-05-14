// Rutas de /api/nextProcess contra SQL Server.
import { Router } from "express";
import { getNextProcess } from "../db/getNextProcess.js";

const router = Router();

// POST /api/nextProcess — consulta proceso siguiente en SQL Server.
router.post("/nextProcess", async (req, res) => {
  const { partNumbers } = req.body || {};

  // Validacion: partNumbers debe ser un array no vacio de strings.
  if (!Array.isArray(partNumbers) || partNumbers.length === 0) {
    return res
      .status(400)
      .json({ error: "Body debe incluir { partNumbers: string[] } no vacio" });
  }
  if (!partNumbers.every((pn) => typeof pn === "string")) {
    return res
      .status(400)
      .json({ error: "Todos los elementos de partNumbers deben ser strings" });
  }

  try {
    const result = await getNextProcess(partNumbers);
    res.json(result);
  } catch (err) {
    console.error("[destinations] error en next-route:", err.message);
    res.status(500).json({
      error: "Error al consultar ruta siguiente",
      detail: err.message,
    });
  }
});

export default router;
