import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { errorHandler } from './middleware/error.mjs';
import { health } from './routes/health.mjs';
import { auth } from './routes/auth.mjs';
import { users } from './routes/users.mjs';
import { roles } from './routes/roles.mjs';
import { permissions } from './routes/permissions.mjs';
import { audit } from './routes/audit.mjs';

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

const limiter = rateLimit({ windowMs: 15*60*1000, max: 300 });
app.use(limiter);

// Rutas
app.use('/api', health);
app.use('/api', auth);
app.use('/api', users);
app.use('/api', roles);
app.use('/api', permissions);
app.use('/api', audit);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Not Found' }));

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 dem_roles_v5 API listening on http://localhost:${PORT}`);
});
