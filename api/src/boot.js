// M6: startpunkten i imagen (CMD i api/Dockerfile). Lokalt med npm run dev startar index.js direkt.
//
// I molnet kör Postgres och Mongo som sidecars bredvid API:et, utan volym: varje gång appen
// väcks från noll replicas är databasen tom. Med SEED_ON_START=1 väntar vi in Postgres,
// seedar om users är tom, kör migrate:logs, och startar sedan servern. Utan variabeln gör
// filen ingenting mer än att starta index.js – så compose och pipelinen beter sig som förut.
import { pool } from './db/client.js';
import { seed } from './db/seed.js';
import { migrateLogs } from './db/migrate-logs.js';
import { mongo } from './db/mongo.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitForPostgres = async (attempts = 30) => {
  for (let i = 1; i <= attempts; i++) {
    try {
      await pool.query('select 1');
      return;
    } catch (err) {
      console.log(`boot: väntar på Postgres (${i}/${attempts}): ${err.message}`);
      await sleep(2000);
    }
  }
  throw new Error('boot: Postgres svarade inte');
};

const seedIfEmpty = async () => {
  let users = 0;
  try {
    users = Number((await pool.query('select count(*) from users')).rows[0].count);
  } catch {
    users = 0; // tabellen finns inte än – seed skapar den
  }
  if (users > 0) {
    console.log(`boot: ${users} användare finns redan – ingen seed`);
    return;
  }
  console.log('boot: tom databas – seedar');
  await seed();
  await mongo.connect();
  await migrateLogs();
};

if (process.env.SEED_ON_START === '1') {
  await waitForPostgres();
  await seedIfEmpty();
}

await import('./index.js');
