import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { pool } from './db/client.js';
import { mongo } from './db/mongo.js';
import { authRouter } from './routes/auth.js';
import { guidesRouter } from './routes/guides.ts';
import { toursRouter } from './routes/tours.js';
import { photosRouter } from './routes/photos.js';
import { yoga } from './graphql/server.js';

const app = express();

app.use(cors());

// GraphQL (M4): en endpoint bredvid REST-routerna. Ligger före express.json() – yoga läser sin egen body.
app.use(yoga.graphqlEndpoint, yoga);

app.use(express.json({ limit: '50mb' }));

// Svarar med om databaserna nås. Compose och molnet frågar hit för att veta om API:et lever.
// M6: `sha` är commiten imagen byggdes från – pipelinen väntar på att molnet svarar med rätt sha.
app.get('/api/health', async (req, res) => {
  const check = async (fn) => {
    try {
      await fn();
      return 'ok';
    } catch (err) {
      return `fel: ${err.message}`;
    }
  };
  const postgres = await check(() => pool.query('select 1'));
  const mongodb = await check(async () => {
    await mongo.connect(); // gör inget om klienten redan är ansluten
    await mongo.db().command({ ping: 1 });
  });
  const ok = postgres === 'ok' && mongodb === 'ok';
  res.status(ok ? 200 : 503).json({ ok, version: '1.4.2', sha: config.gitSha, postgres, mongodb });
});

app.use('/api/auth', authRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/tours', toursRouter);
app.use('/api/photos', photosRouter);

app.listen(config.port, () => {
  console.log(`API lyssnar på http://localhost:${config.port}`);
});

// Servern dog i produktion en fredag när någon skrev in ett ogiltigt id.
// Det här håller den vid liv. Anropet får inget svar, men resten funkar. /marcus 2022-09-02
process.on('unhandledRejection', (err) => {
  console.error('Ohanterat fel:', err.message);
});
