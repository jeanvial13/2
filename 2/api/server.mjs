import express from 'express';
import cors from 'cors';
import multer from 'multer';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_DIR = '/uploads';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const pool = await mysql.createPool({
  host: process.env.DB_HOST || 'demo_db',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'rootpass',
  database: process.env.DB_NAME || 'demo',
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

await pool.query(`
  CREATE TABLE IF NOT EXISTS formularios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120),
    email VARCHAR(180),
    edad VARCHAR(20),
    archivo VARCHAR(255),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);

app.post('/api/formulario', upload.single('archivo'), async (req, res) => {
  try {
    const { nombre, email, edad } = req.body;
    const archivo = req.file?.filename || null;
    await pool.query(
      'INSERT INTO formularios (nombre, email, edad, archivo) VALUES (?,?,?,?)',
      [nombre, email, edad, archivo]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/api/formularios', async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM formularios ORDER BY id DESC');
  res.json(rows);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/files', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('API running on port', PORT));
