import './env.js';
import cors from 'cors';
import express from 'express';
import tapRouter from './routes/tap.js';
import sellersRouter from './routes/sellers.js';
import cityIdentityRouter from './routes/cityIdentity.js';
import localFeedRouter from './routes/localFeed.js';
import shareCardRouter from './routes/shareCard.js';
import geocodeRouter from './routes/geocode.js';
import communityBoardRouter from './routes/communityBoard.js';
import territoryRouter from './routes/territory.js';
import localEventsRouter from './routes/localEvents.js';

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
app.use('/api/sellers', sellersRouter);
app.use('/api/city-identity', cityIdentityRouter);
app.use('/api/local-feed', localFeedRouter);
app.use('/api/share-card', shareCardRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/board', communityBoardRouter);
app.use('/api/territory', territoryRouter);
app.use('/api/events', localEventsRouter);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ethicalalt-server listening on ${PORT}`);
});
