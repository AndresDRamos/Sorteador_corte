// Bootstrap del servidor Express: monta middlewares basicos y rutas.
import express from 'express';
import nestingsRouter from './routes/nestings.js';
import destinationsRouter from './routes/destinations.js';

const app = express();
// Body JSON unicamente; los uploads se manejan en su router con multer.
app.use(express.json());

// Health check minimo para validar despliegue.
app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/api/nestings', nestingsRouter);
app.use('/api/destinations', destinationsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[server] escuchando en http://localhost:${PORT}`);
});
