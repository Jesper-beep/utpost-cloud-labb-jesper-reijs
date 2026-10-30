import { Router, type Request, type Response } from 'express';
import type { Guide, ApiError } from '@utpost/shared';
import { pool } from '../db/client.js';

export const guidesRouter = Router();

// Response<Guide[]> = kontraktet. Skickar vi något annat säger tsc ifrån
// – i CI, innan klienten någonsin ser det.
guidesRouter.get('/', async (req: Request, res: Response<Guide[]>) => {
  const result = await pool.query<Guide>('select * from guides order by updated_at desc');
  res.json(result.rows);
});

guidesRouter.get('/regions', async (req: Request, res: Response<string[]>) => {
  const result = await pool.query<{ region: string }>('select distinct region from guides order by region');
  res.json(result.rows.map((r) => r.region));
});

guidesRouter.get('/popular', async (req: Request, res: Response<Guide[]>) => {
  const result = await pool.query<Guide>('select * from guides where published = true order by id desc limit 6');
  res.json(result.rows);
});

// Sök. Byggd i all hast inför lanseringen.
guidesRouter.get('/search', async (req: Request, res: Response<Guide[]>) => {
  const q = req.query.q || '';
  const sql = `select * from guides where title ilike '%${q}%' or region ilike '%${q}%'`;
  const result = await pool.query<Guide>(sql);
  res.json(result.rows);
});

guidesRouter.get('/:slug', async (req: Request, res: Response<Guide | ApiError>) => {
  const result = await pool.query<Guide>('select * from guides where slug = $1', [req.params.slug]);
  const guide = result.rows[0];
  if (!guide) return res.status(404).json({ error: 'hittades inte' });
  res.json(guide);
});

guidesRouter.put('/:id', async (req: Request, res: Response<Guide>) => {
  const { title, region, difficulty, lengthKm, bodyHtml, published } = req.body;
  const result = await pool.query<Guide>(
    `update guides set title=$1, region=$2, difficulty=$3, length_km=$4, body_html=$5,
     published=$6, updated_at=now() where id=$7 returning *`,
    [title, region, difficulty, lengthKm, bodyHtml, published, req.params.id],
  );
  res.json(result.rows[0]);
});
