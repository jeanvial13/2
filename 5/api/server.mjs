import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const DATA_DIR = process.env.DATA_DIR || '/data';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads';
const JWT_SECRET = process.env.JWT_SECRET || 'change_me';
const COOKIE_NAME = process.env.COOKIE_NAME || 'auth';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const adapter = new JSONFile(path.join(DATA_DIR, 'db.json'));
const db = new Low(adapter, { formularios: [], users: [], nextId: 1, nextUserId: 3 });
await db.read();
if (!db.data) db.data = { formularios: [], users: [], nextId: 1, nextUserId: 3 };

// Seed base
if (!db.data.users || db.data.users.length === 0) {
  const adminHash = bcrypt.hashSync('demo123', 10);
  const userHash = bcrypt.hashSync('user123', 10);
  db.data.users = [
    { id: 1, username: 'admin', passwordHash: adminHash, role: 'admin' },
    { id: 2, username: 'usuario', passwordHash: userHash, role: 'user' }
  ];
  db.data.nextUserId = 3;
  await db.write();
  console.log('👥 admin/demo123 — usuario/user123');
}

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

// Auth helpers
function sign(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}
function authRequired(req, res, next) {
  try {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ ok:false, error:'Admin only' });
  next();
}

// Health
app.get('/api/health', async (req, res) => {
  await db.read();
  res.json({ ok: true, now: new Date().toISOString(), count: db.data.formularios.length });
});

// Auth endpoints
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }
  const token = sign(user);
  res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000 });
  res.json({ ok: true, user: { username: user.username, role: user.role } });
});
app.post('/api/logout', (req, res) => { res.clearCookie(COOKIE_NAME); res.json({ ok: true }); });
app.get('/api/me', authRequired, (req, res) => { res.json({ ok: true, user: req.user }); });

// CRUD formularios
app.post('/api/formulario', authRequired, upload.single('archivo'), async (req, res) => {
  const { nombre, email, edad } = req.body;
  const archivo = req.file?.filename || null;
  await db.read();
  const id = db.data.nextId++;
  db.data.formularios.unshift({ id, userId: req.user.id, nombre, email, edad, archivo, fecha: new Date().toISOString() });
  await db.write();
  res.json({ ok: true, id });
});

// List with filter/page
app.get('/api/formularios', authRequired, async (req, res) => {
  await db.read();
  const { all, filter = '', page = '1', pageSize = '1000' } = req.query;
  let rows = db.data.formularios;
  if (!(all && req.user.role === 'admin')) rows = rows.filter(r => r.userId === req.user.id);
  const q = (filter || '').toString().toLowerCase();
  if (q) rows = rows.filter(r =>
    (r.nombre||'').toLowerCase().includes(q) ||
    (r.email||'').toLowerCase().includes(q) ||
    (r.edad||'').toString().includes(q)
  );
  const p = Math.max(1, parseInt(page)); const ps = Math.max(1, parseInt(pageSize));
  const total = rows.length;
  const start = (p-1)*ps;
  const data = rows.slice(start, start+ps);
  res.json({ data, total, page: p, pageSize: ps });
});

// Files (permisos)
app.get('/api/files/:file', authRequired, async (req, res) => {
  const file = req.params.file;
  await db.read();
  const row = db.data.formularios.find(r => r.archivo === file);
  if (!row) return res.status(404).json({ ok:false, error:'Not found' });
  if (req.user.role !== 'admin' && row.userId !== req.user.id) return res.status(403).json({ ok:false, error:'Forbidden' });
  return res.sendFile(path.resolve(path.join(UPLOAD_DIR, file)));
});

// Admin: users
app.get('/api/users', authRequired, adminOnly, async (req, res) => {
  await db.read();
  const safe = db.data.users.map(u => ({ id: u.id, username: u.username, role: u.role }));
  res.json(safe);
});
app.post('/api/users', authRequired, adminOnly, async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) return res.status(400).json({ ok:false, error:'Campos requeridos' });
  await db.read();
  if (db.data.users.some(u => u.username === username)) return res.status(409).json({ ok:false, error:'Usuario ya existe' });
  const id = db.data.nextUserId++;
  const passwordHash = bcrypt.hashSync(password, 10);
  db.data.users.push({ id, username, passwordHash, role });
  await db.write();
  res.json({ ok:true, id });
});
app.patch('/api/users/:id', authRequired, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  const { password, role } = req.body || {};
  await db.read();
  const user = db.data.users.find(u => u.id === id);
  if (!user) return res.status(404).json({ ok:false, error:'No existe' });
  if (password) user.passwordHash = bcrypt.hashSync(password, 10);
  if (role) user.role = role;
  await db.write();
  res.json({ ok:true });
});
app.delete('/api/users/:id', authRequired, adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  await db.read();
  if (id === 1) return res.status(400).json({ ok:false, error:'No se puede borrar el admin por defecto' });
  db.data.users = db.data.users.filter(u => u.id !== id);
  await db.write();
  res.json({ ok:true });
});

// Stats
app.get('/api/stats', authRequired, async (req, res) => {
  await db.read();
  const totalForms = db.data.formularios.length;
  const totalUsers = db.data.users.length;
  const lastFormDate = db.data.formularios[0]?.fecha || null;
  res.json({ ok:true, totalForms, totalUsers, lastFormDate });
});

// Export CSV (admin)
app.get('/api/export/forms.csv', authRequired, adminOnly, async (req, res) => {
  await db.read();
  const rows = db.data.formularios;
  const header = 'id,userId,nombre,email,edad,archivo,fecha\n';
  const body = rows.map(r => [r.id,r.userId,r.nombre,r.email,r.edad,r.archivo,r.fecha].map(v => (v??'')).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="formularios.csv"');
  res.send(header + body);
});
app.get('/api/export/users.csv', authRequired, adminOnly, async (req, res) => {
  await db.read();
  const rows = db.data.users;
  const header = 'id,username,role\n';
  const body = rows.map(u => [u.id,u.username,u.role].join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="usuarios.csv"');
  res.send(header + body);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 API (roles v5) en', PORT));
