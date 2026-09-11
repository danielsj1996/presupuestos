import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const isRemoteDb = Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'));
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : false
});
const backendDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.join(backendDirectory, '..', 'frontend');

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map(value => value.trim()) || true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(frontendDirectory));

function requiredText(value, field) {
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error(`${field} es obligatorio`);
    error.status = 400;
    throw error;
  }
  return value.trim();
}

function optionalText(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function parseUuid(value, field) {
  requiredText(value, field);
  return value;
}

function sendError(response, error) {
  console.error(error);
  response.status(error.status || 500).json({ error: error.status ? error.message : 'Error interno del servidor' });
}

app.get('/api/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
    response.json({ ok: true, database: 'postgresql' });
  } catch (error) {
    sendError(response, error);
  }
});

app.get('/api/clients', async (_request, response) => {
  try {
    const result = await pool.query(`
      SELECT c.*, COUNT(b.id)::int AS budget_count
      FROM clients c
      LEFT JOIN projects p ON p.client_id = c.id
      LEFT JOIN budgets b ON b.project_id = p.id AND b.status <> 'cancelled'
      GROUP BY c.id
      ORDER BY lower(c.full_name)
    `);
    response.json(result.rows);
  } catch (error) {
    sendError(response, error);
  }
});

app.post('/api/clients', async (request, response) => {
  try {
    const fullName = requiredText(request.body.fullName, 'fullName');
    const result = await pool.query(`
      INSERT INTO clients (full_name, tax_id, phone, email)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [fullName, optionalText(request.body.taxId), optionalText(request.body.phone), optionalText(request.body.email)]);
    response.status(201).json(result.rows[0]);
  } catch (error) {
    sendError(response, error);
  }
});

app.patch('/api/clients/:id', async (request, response) => {
  try {
    const id = parseUuid(request.params.id, 'id');
    const fullName = requiredText(request.body.fullName, 'fullName');
    const result = await pool.query(`
      UPDATE clients SET full_name = $1, tax_id = $2, phone = $3, email = $4
      WHERE id = $5 RETURNING *
    `, [fullName, optionalText(request.body.taxId), optionalText(request.body.phone), optionalText(request.body.email), id]);
    if (!result.rowCount) return response.status(404).json({ error: 'Cliente no encontrado' });
    response.json(result.rows[0]);
  } catch (error) {
    sendError(response, error);
  }
});

app.delete('/api/clients/:id', async (request, response) => {
  try {
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [parseUuid(request.params.id, 'id')]);
    if (!result.rowCount) return response.status(404).json({ error: 'Cliente no encontrado' });
    response.status(204).end();
  } catch (error) {
    if (error.code === '23503') return response.status(409).json({ error: 'No se puede borrar un cliente con obras asociadas' });
    sendError(response, error);
  }
});

app.get('/api/architects', async (_request, response) => {
  try {
    const result = await pool.query('SELECT * FROM architects ORDER BY lower(full_name)');
    response.json(result.rows);
  } catch (error) {
    sendError(response, error);
  }
});

app.post('/api/architects', async (request, response) => {
  try {
    const result = await pool.query(`
      INSERT INTO architects (full_name, tax_id, phone, email, professional_license)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [requiredText(request.body.fullName, 'fullName'), optionalText(request.body.taxId), optionalText(request.body.phone), optionalText(request.body.email), requiredText(request.body.professionalLicense, 'professionalLicense')]);
    response.status(201).json(result.rows[0]);
  } catch (error) {
    sendError(response, error);
  }
});

app.patch('/api/architects/:id', async (request, response) => {
  try {
    const result = await pool.query(`
      UPDATE architects SET full_name = $1, tax_id = $2, phone = $3, email = $4, professional_license = $5
      WHERE id = $6 RETURNING *
    `, [requiredText(request.body.fullName, 'fullName'), optionalText(request.body.taxId), optionalText(request.body.phone), optionalText(request.body.email), requiredText(request.body.professionalLicense, 'professionalLicense'), parseUuid(request.params.id, 'id')]);
    if (!result.rowCount) return response.status(404).json({ error: 'Arquitecto no encontrado' });
    response.json(result.rows[0]);
  } catch (error) {
    sendError(response, error);
  }
});

app.delete('/api/architects/:id', async (request, response) => {
  try {
    const result = await pool.query('DELETE FROM architects WHERE id = $1 RETURNING id', [parseUuid(request.params.id, 'id')]);
    if (!result.rowCount) return response.status(404).json({ error: 'Arquitecto no encontrado' });
    response.status(204).end();
  } catch (error) {
    if (error.code === '23503') return response.status(409).json({ error: 'No se puede borrar un arquitecto con obras asociadas' });
    sendError(response, error);
  }
});

app.get('/api/clients/:id/budgets', async (request, response) => {
  try {
    const result = await pool.query(`
      SELECT b.id, b.type, b.status, b.period_label, b.total_amount, b.currency, b.created_at,
             p.id AS project_id, p.name AS project_name, a.full_name AS architect_name
      FROM budgets b
      JOIN projects p ON p.id = b.project_id
      JOIN architects a ON a.id = p.architect_id
      WHERE p.client_id = $1 AND b.status <> 'cancelled'
      ORDER BY b.created_at DESC
    `, [parseUuid(request.params.id, 'id')]);
    response.json(result.rows);
  } catch (error) {
    sendError(response, error);
  }
});

app.post('/api/budgets', async (request, response) => {
  const client = await pool.connect();
  try {
    const body = request.body;
    const clientId = parseUuid(body.clientId, 'clientId');
    const architectId = parseUuid(body.architectId, 'architectId');
    const projectName = requiredText(body.projectName, 'projectName');
    const type = body.type === 'weekly' ? 'weekly' : body.type === 'materials' ? 'materials' : null;
    if (!type) return response.status(400).json({ error: 'type debe ser materials o weekly' });
    const periodLabel = requiredText(body.periodLabel, 'periodLabel');
    if (!Array.isArray(body.items) || !body.items.length) return response.status(400).json({ error: 'Debe incluir al menos una partida' });

    const items = body.items.map((item, index) => ({
      description: requiredText(item.description, `items[${index}].description`),
      category: requiredText(item.category, `items[${index}].category`),
      quantity: Number(item.quantity),
      unit: requiredText(item.unit, `items[${index}].unit`),
      unitPrice: Number(item.unitPrice),
      status: requiredText(item.status, `items[${index}].status`),
      position: index
    }));
    if (items.some(item => !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) return response.status(400).json({ error: 'Las cantidades deben ser positivas y los precios no negativos' });
    const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    await client.query('BEGIN');
    const project = await client.query(`
      INSERT INTO projects (client_id, architect_id, name) VALUES ($1, $2, $3)
      ON CONFLICT (client_id, name) DO UPDATE SET architect_id = EXCLUDED.architect_id, updated_at = now()
      RETURNING id
    `, [clientId, architectId, projectName]);
    const budget = await client.query(`
      INSERT INTO budgets (project_id, type, period_label, printed_at, total_amount)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [project.rows[0].id, type, periodLabel, body.printedAt || null, total.toFixed(2)]);
    for (const item of items) await client.query(`
      INSERT INTO budget_items (budget_id, description, category, quantity, unit, unit_price, status, position)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [budget.rows[0].id, item.description, item.category, item.quantity, item.unit, item.unitPrice, item.status, item.position]);
    await client.query('COMMIT');
    response.status(201).json({ ...budget.rows[0], projectId: project.rows[0].id, items });
  } catch (error) {
    await client.query('ROLLBACK');
    sendError(response, error);
  } finally {
    client.release();
  }
});

app.use((_request, response) => response.status(404).json({ error: 'Ruta no encontrada' }));

app.listen(port, () => console.log(`Obra Clara API escuchando en http://localhost:${port}`));
