// Bootstrap del servidor Express: monta middlewares basicos y rutas.
// Cargamos variables de entorno desde .env antes que cualquier otro import.
import "dotenv/config";
import express from "express";
import nestingsRouter from "./routes/nestings.js";
import nextProcess from "./routes/nextProcess.js";

const app = express();
// Body JSON unicamente; los uploads se manejan en su router con multer.
app.use(express.json());

// Health check minimo para validar despliegue.
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", nestingsRouter);
app.use("/api", nextProcess);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] escuchando en http://localhost:${PORT}`);
});
