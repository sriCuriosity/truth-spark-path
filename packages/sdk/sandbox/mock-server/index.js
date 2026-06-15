const http = require('http');
const { Pool } = require('pg');
const { execSync } = require('child_process');

// Install dependencies on start
try {
  console.log("Installing pg module for mock-server...");
  execSync('npm install', { stdio: 'inherit' });
} catch (e) {
  console.error("Failed to run npm install in mock-server:", e);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://nexus_dev:secret_password@postgres:5432/nexus_sandbox',
});

const port = process.env.PORT || 54321;

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, apikey, authorization, prefer');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  // Emulate rest/v1/cortex_entries
  if (pathname === '/rest/v1/cortex_entries') {
    try {
      if (req.method === 'GET') {
        const userIdParam = parsedUrl.searchParams.get('user_id');
        let query = 'SELECT * FROM public.cortex_entries';
        let params = [];
        if (userIdParam) {
          // e.g. eq.UUID
          const val = userIdParam.replace(/^eq\./, '');
          query += ' WHERE user_id = $1';
          params.push(val);
        }
        query += ' ORDER BY created_at DESC';
        const { rows } = await pool.query(query, params);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(rows));
      } else if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const query = `
              INSERT INTO public.cortex_entries 
              (user_id, entry_type, title, body, outcome, what_i_learned, previous_belief, new_belief, domains, is_public) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *
            `;
            const params = [
              data.user_id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
              data.entry_type,
              data.title,
              data.body,
              data.outcome || null,
              data.what_i_learned || null,
              data.previous_belief || null,
              data.new_belief || null,
              data.domains || [],
              data.is_public || false
            ];
            const { rows } = await pool.query(query, params);
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rows));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (req.method === 'PATCH') {
        const idParam = parsedUrl.searchParams.get('id');
        if (!idParam) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Missing id filter" }));
          return;
        }
        const id = idParam.replace(/^eq\./, '');
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const fields = [];
            const values = [];
            let idx = 1;
            for (const key of Object.keys(data)) {
              fields.push(`${key} = $${idx}`);
              values.push(data[key]);
              idx++;
            }
            values.push(id);
            const query = `UPDATE public.cortex_entries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
            const { rows } = await pool.query(query, values);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(rows));
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else if (req.method === 'DELETE') {
        const idParam = parsedUrl.searchParams.get('id');
        if (!idParam) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: "Missing id filter" }));
          return;
        }
        const id = idParam.replace(/^eq\./, '');
        await pool.query('DELETE FROM public.cortex_entries WHERE id = $1', [id]);
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(405);
        res.end();
      }
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: e.message }));
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(port, () => {
  console.log(`Mock Supabase REST API server running on port ${port}`);
});
