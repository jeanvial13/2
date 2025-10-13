import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = process.env.DATA_DIR || '/data';
const UPLOAD_DIR = process.env.UPLOAD_DIR || '/uploads';

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// LowDB setup (archivo JSON persistente)
const adapter = new JSONFile(path.join(DATA_DIR, 'db.json'));
const db = new Low(adapter, { formularios: [], nextId: 1 });
await db.read();
if (!db.data) db.data = { formularios: [], nextId: 1 };

// Multer (subidas)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

app.get('/api/health', (req, res) => {
  res.json({ ok: true, now: new Date().toISOString(), count: db.data.formularios.length });
});

app.post('/api/formulario', upload.single('archivo'), async (req, res) => {
  try {
    const { nombre, email, edad } = req.body;
    const archivo = req.file?.filename || null;
    const id = db.data.nextId++;
    db.data.formularios.unshift({ id, nombre, email, edad, archivo, fecha: new Date().toISOString() });
    await db.write();
    res.json({ ok: true, id });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/formularios', async (req, res) => {
  await db.read();
  res.json(db.data.formularios);
});

app.use('/api/files', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 API running on', PORT));
