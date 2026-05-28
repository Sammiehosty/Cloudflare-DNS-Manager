const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend in production
app.use(express.static(path.join(__dirname, '../dist')));

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'sammarle_cf',
  password: process.env.DB_PASSWORD || 'sammarle_cf',
  database: process.env.DB_NAME || 'sammarle_cf',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Admin Config Management
async function getAdminConfig() {
  try {
    const [rows] = await pool.query('SELECT password, theme FROM admin_config WHERE id = 1');
    return rows.length > 0 ? rows[0] : { password: 'admin123', theme: 'light' };
  } catch (err) { 
    console.error('Database Error in getAdminConfig:', err.message);
    return { password: 'admin123', theme: 'light' }; 
  }
}

// --- AUTH & CONFIG ENDPOINTS ---

app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  try {
    const config = await getAdminConfig();
    if (password === config.password) {
      res.json({ success: true, theme: config.theme });
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Login process failed' });
  }
});

app.post('/api/admin/password', async (req, res) => {
  const { password } = req.body;
  try {
    await pool.query('INSERT INTO admin_config (id, password) VALUES (1, ?) ON DUPLICATE KEY UPDATE password = ?', [password, password]);
    res.json({ success: true });
  } catch (err) { 
    console.error('Failed to update password:', err.message);
    res.status(500).json({ error: 'Failed to update password' }); 
  }
});

app.post('/api/admin/theme', async (req, res) => {
  const { theme } = req.body;
  try {
    await pool.query('INSERT INTO admin_config (id, theme) VALUES (1, ?) ON DUPLICATE KEY UPDATE theme = ?', [theme, theme]);
    res.json({ success: true });
  } catch (err) { 
    console.error('THEME ERROR:', err.message);
    res.status(500).json({ error: 'Failed to save theme: ' + err.message }); 
  }
});

// --- USER/CLIENT ENDPOINTS ---

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users', async (req, res) => {
  const { name, website, cf_token, zone_id } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO users (name, website, cf_token, zone_id) VALUES (?, ?, ?, ?)', [name, website, cf_token, zone_id]);
    res.json({ id: result.insertId, name, website, cf_token, zone_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/users/:id', async (req, res) => {
  const { name, website, cf_token, zone_id } = req.body;
  try {
    await pool.query('UPDATE users SET name = ?, website = ?, cf_token = ?, zone_id = ? WHERE id = ?', [name, website, cf_token, zone_id, req.params.id]);
    res.json({ id: req.params.id, name, website, cf_token, zone_id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CLOUDFLARE PROXY ROUTES ---
const CF_BASE = 'https://api.cloudflare.com/client/v4';
const cfHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

app.get('/api/cf/:zoneId/dns_records', async (req, res) => {
  try {
    const resp = await axios.get(`${CF_BASE}/zones/${req.params.zoneId}/dns_records`, {
      headers: cfHeaders(req.headers['x-cf-token'])
    });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.post('/api/cf/:zoneId/dns_records', async (req, res) => {
  try {
    const resp = await axios.post(`${CF_BASE}/zones/${req.params.zoneId}/dns_records`, req.body, {
      headers: cfHeaders(req.headers['x-cf-token'])
    });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.patch('/api/cf/:zoneId/dns_records/:recordId', async (req, res) => {
  try {
    const resp = await axios.patch(`${CF_BASE}/zones/${req.params.zoneId}/dns_records/${req.params.recordId}`, req.body, {
      headers: cfHeaders(req.headers['x-cf-token'])
    });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.delete('/api/cf/:zoneId/dns_records/:recordId', async (req, res) => {
  try {
    const resp = await axios.delete(`${CF_BASE}/zones/${req.params.zoneId}/dns_records/${req.params.recordId}`, {
      headers: cfHeaders(req.headers['x-cf-token'])
    });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.post('/api/cf/:zoneId/purge_cache', async (req, res) => {
  try {
    const resp = await axios.post(`${CF_BASE}/zones/${req.params.zoneId}/purge_cache`, { purge_everything: true }, {
      headers: cfHeaders(req.headers['x-cf-token'])
    });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.patch('/api/cf/:zoneId/dev_mode', async (req, res) => {
  try {
    const resp = await axios.patch(`${CF_BASE}/zones/${req.params.zoneId}/settings/development_mode`, req.body, {
      headers: cfHeaders(req.headers['x-cf-token'])
    });
    res.json(resp.data);
  } catch (err) {
    res.status(err.response?.status || 500).json(err.response?.data || { error: err.message });
  }
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✓ Proxy API running on port ${PORT}`));
