import './env.js';
import cors from 'cors';
import express from 'express';
import { registryHeaders } from './middleware/registryHeaders.js';
import tapRouter from './routes/tap.js';
import sellersRouter from './routes/sellers.js';
import cityIdentityRouter from './routes/cityIdentity.js';
import localFeedRouter from './routes/localFeed.js';
import shareCardRouter from './routes/shareCard.js';
import shareExportRouter from './routes/shareExport.js';
import geocodeRouter from './routes/geocode.js';
import communityBoardRouter from './routes/communityBoard.js';
import territoryRouter from './routes/territory.js';
import localEventsRouter from './routes/localEvents.js';
import localCommercialRouter from './routes/localCommercial.js';
import witnessRouter from './routes/witness.js';
import documentaryRouter from './routes/documentary.js';
import workersRouter from './routes/workers.js';
import profileIndexRouter from './routes/profiles.index.route.js';
import impactRouter from './routes/impact.js';
import { getProviderHealthSnapshot } from './services/aiProvider.js';
import {
  buildProportionalityPacket,
  PROPORTIONALITY_CATEGORIES,
} from './services/proportionality.js';

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
app.use(registryHeaders);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/health/providers', (_req, res) => {
  res.json(getProviderHealthSnapshot());
});

const proportionalityCategorySet = new Set(PROPORTIONALITY_CATEGORIES);

app.get('/proportionality', (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : '';
  if (!category || !proportionalityCategorySet.has(category)) {
    return res.status(400).json({ ok: false, error: 'invalid or missing category' });
  }
  const violationType =
    typeof req.query.violation_type === 'string' ? req.query.violation_type : '';
  const chargeStatus =
    typeof req.query.charge_status === 'string' && req.query.charge_status.trim()
      ? req.query.charge_status.trim()
      : null;
  const amountRaw = req.query.amount_involved;
  let amountInvolved = null;
  if (amountRaw != null && String(amountRaw).trim() !== '') {
    const n = Number(amountRaw);
    amountInvolved = Number.isFinite(n) ? n : null;
  }
  let lat = null;
  let lng = null;
  if (req.query.lat != null && String(req.query.lat).trim() !== '') {
    const la = Number(req.query.lat);
    if (Number.isFinite(la)) lat = la;
  }
  if (req.query.lng != null && String(req.query.lng).trim() !== '') {
    const ln = Number(req.query.lng);
    if (Number.isFinite(ln)) lng = ln;
  }
  const packet = buildProportionalityPacket({
    category,
    violationType,
    chargeStatus,
    amountInvolved,
    lat,
    lng,
  });
  res.json({ ok: true, proportionality: packet });
});

app.use('/api/workers', workersRouter);
app.use('/api', tapRouter);
app.use('/api', impactRouter);
app.use('/api/profiles', profileIndexRouter);
app.use('/api/sellers', sellersRouter);
app.use('/api/city-identity', cityIdentityRouter);
app.use('/api/local-feed', localFeedRouter);
app.use('/api/share-card', shareCardRouter);
app.use('/api/share-export', shareExportRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/board', communityBoardRouter);
app.use('/api/territory', territoryRouter);
app.use('/api/events', localEventsRouter);
app.use('/api/local-commercial', localCommercialRouter);
app.use('/api/witness', witnessRouter);
app.use('/api/documentary', documentaryRouter);

const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
  console.log(`ethicalalt-server listening on ${PORT}`);
});
