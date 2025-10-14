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
const db = new Low(adapter, { formularios: [], users: [], nextId: 1, nextUserId: 2 });
await db.read();
if (!db.data) db.data = { formularios: [], users: [], nextId: 1, nextUserId: 2 };

// Seed: admin y user
if (!db.data.users || db.data.users.length === 0) {
  const adminHash = bcrypt.hashSync('demo123', 10);
  const userHash = bcrypt.hashSync('user123', 10);
  db.data.users = [
    { id: 1, username: 'admin', passwordHash: adminHash, role: 'admin' },
    { id: 2, username: 'usuario', passwordHash: userHash, role: 'user' }
  ];
  db.data.nextUserId = 3;
  await db.write();
  console.log('👥 Usuarios: admin/demo123, usuario/user123');
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

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
  } catch (e) {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }
}
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ ok:false, error:'Admin only' });
  next();
}

app.get('/api/health', async (req, res) => {
  await db.read();
  res.json({ ok: true, now: new Date().toISOString(), count: db.data.formularios.length });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  await db.read();
  const user = db.data.users.find(u => u.username === username);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ ok: false, error: 'Credenciales inválidas' });
  }
  const token = sign(user);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*60*60*1000
  });
  res.json({ ok: true, user: { username: user.username, role: user.role } });
});
app.post('/api/logout', (req, res) => { res.clearCookie(COOKIE_NAME); res.json({ ok: true }); });
app.get('/api/me', authRequired, (req, res) => { res.json({ ok: true, user: req.user }); });

// CRUD
app.post('/api/formulario', authRequired, upload.single('archivo'), async (req, res) => {
  const { nombre, email, edad } = req.body;
  const archivo = req.file?.filename || null;
  await db.read();
  const id = db.data.nextId++;
  db.data.formularios.unshift({ id, userId: req.user.id, nombre, email, edad, archivo, fecha: new Date().toISOString() });
  await db.write();
  res.json({ ok: true, id });
});

app.get('/api/formularios', authRequired, async (req, res) => {
  await db.read();
  const { all } = req.query;
  let rows = db.data.formularios;
  if (!(all && req.user.role === 'admin')) {
    rows = rows.filter(r => r.userId === req.user.id);
  }
  res.json(rows);
});

// Solo admin puede ver/descargar cualquier archivo; usuario solo los suyos
app.get('/api/files/:file', authRequired, async (req, res, next) => {
  const file = req.params.file;
  await db.read();
  const row = db.data.formularios.find(r => r.archivo === file);
  if (!row) return res.status(404).end();
  if (req.user.role !== 'admin' && row.userId !== req.user.id) return res.status(403).json({ ok:false, error:'Forbidden' });
  next();
}, express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 API (roles) en', PORT));
