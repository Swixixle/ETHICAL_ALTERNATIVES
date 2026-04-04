import './env.js';
import cors from 'cors';
import express from 'express';
import tapRouter from './routes/tap.js';

const app = express();

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : defaultOrigins;

app.use(
  cors({
    origin: corsOrigins,
  })
);
app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/api', tapRouter);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ethicalalt-server listening on ${PORT}`);
});
