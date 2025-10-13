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

const DB_HOST = process.env.DB_HOST || 'demo_db';
const DB_ROOT_PASSWORD = process.env.DB_ROOT_PASSWORD || 'rootpass';
const APP_DB = process.env.APP_DB || 'demo';
const APP_USER = process.env.APP_USER || 'demo';
const APP_PASSWORD = process.env.APP_PASSWORD || 'demopass';

console.log('🛠️  Preparing database...' );

const rootConn = await mysql.createConnection({
  host: DB_HOST,
  user: 'root',
  password: DB_ROOT_PASSWORD,
  multipleStatements: true
});
await rootConn.query(`
  CREATE DATABASE IF NOT EXISTS \`${APP_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS '${APP_USER}'@'%' IDENTIFIED BY '${APP_PASSWORD}';
  GRANT ALL PRIVILEGES ON \`${APP_DB}\`.* TO '${APP_USER}'@'%';
  FLUSH PRIVILEGES;
`);
await rootConn.end();
console.log('✅ Database and user ensured');

const pool = await mysql.createPool({
  host: DB_HOST,
  user: APP_USER,
  password: APP_PASSWORD,
  database: APP_DB,
  waitForConnections: true,
  connectionLimit: 5,
});

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
console.log('🧩 Table formularios ensured');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});
const upload = multer({ storage });

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT NOW() AS now');
    res.json({ ok: true, db: rows[0].now });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

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
  try {
    const [rows] = await pool.query('SELECT * FROM formularios ORDER BY id DESC');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.use('/api/files', express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('🚀 API running on port', PORT));
