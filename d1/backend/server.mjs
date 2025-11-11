import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { nanoid } from "nanoid";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// --- DB ---
const dbFile = path.join(__dirname, "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], projects: [] });
await db.read();
db.data ||= { users: [], projects: [] };

// seed admin if not exists
if (!db.data.users.find(u => u.username === "admin")) {
  db.data.users.push({
    id: nanoid(),
    username: "admin",
    password: "admin123", // demo only
    role: "admin"
  });
  await db.write();
}

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- Auth endpoints ---
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.data.users.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, username, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
});

app.post("/api/users", auth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Forbidden" });
  const { username, password, role="user" } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "username/password required" });
  if (db.data.users.find(u => u.username === username)) return res.status(409).json({ error: "exists" });
  const user = { id: nanoid(), username, password, role };
  db.data.users.push(user);
  await db.write();
  res.json({ id: user.id, username, role });
});

// --- Project helpers ---
const STAGES = [
  "Specify Requirements",
  "Business Case Creation",
  "Review / Cost Estimation",
  "Regional Business Operations Review",
  "Business Operations Approval",
  "Functional Design",
  "SOW Request",
  "Budget Approval",
  "CLM Request",
  "Create CSR/PO",
  "CR In Progress"
];

function nowISO(){ return new Date().toISOString(); }

// --- Projects ---
app.get("/api/projects", auth, async (req,res) => {
  const { all } = req.query;
  let items = db.data.projects;
  if (!all) items = items.filter(p => p.ownerId === req.user.id);
  res.json(items);
});

app.post("/api/projects", auth, async (req,res) => {
  const { name, requester, sponsor, owner, costCenter, priority=3, type="normal" } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const project = {
    id: nanoid(),
    name, requester, sponsor, owner, costCenter,
    type, // "normal" | "special"
    status: STAGES[0],
    assignee: "",
    notes: [],
    raci: { R:"", A:"", C:"", I:"" },
    contacts: [],
    priority: Math.max(1, Math.min(4, Number(priority)||3)),
    onHold: false,
    closed: false,
    createdAt: nowISO(),
    lastUpdateAt: nowISO(),
    ownerId: req.user.id,
    history: [{ at: nowISO(), action: "created", by: req.user.username }]
  };
  db.data.projects.push(project);
  await db.write();
  res.json(project);
});

app.get("/api/projects/:id", auth, async (req,res)=>{
  const p = db.data.projects.find(p=>p.id===req.params.id);
  if (!p) return res.status(404).json({error:"not found"});
  res.json(p);
});

app.patch("/api/projects/:id", auth, async (req,res)=>{
  const p = db.data.projects.find(p=>p.id===req.params.id);
  if (!p) return res.status(404).json({error:"not found"});
  Object.assign(p, req.body || {});
  p.lastUpdateAt = nowISO();
  p.history.push({ at: nowISO(), action: "update", by: req.user.username, changes: Object.keys(req.body||{}) });
  await db.write();
  res.json(p);
});

app.post("/api/projects/:id/notes", auth, async (req,res)=>{
  const p = db.data.projects.find(p=>p.id===req.params.id);
  if (!p) return res.status(404).json({error:"not found"});
  const { text } = req.body || {};
  const note = { id: nanoid(), text, by: req.user.username, at: nowISO() };
  p.notes.push(note);
  p.lastUpdateAt = nowISO();
  await db.write();
  res.json(note);
});

app.get("/api/search", auth, async (req,res)=>{
  const q = (req.query.q || "").toLowerCase();
  const items = db.data.projects.filter(p =>
    (p.name||"").toLowerCase().includes(q) ||
    (p.requester||"").toLowerCase().includes(q) ||
    (p.sponsor||"").toLowerCase().includes(q) ||
    (p.owner||"").toLowerCase().includes(q) ||
    (p.costCenter||"").toLowerCase().includes(q) ||
    (p.notes||[]).some(n => (n.text||"").toLowerCase().includes(q))
  );
  res.json(items);
});

// serve static frontend (built as static files)
app.use("/", express.static(path.join(__dirname, "..", "frontend")));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API+Web running on http://localhost:${PORT}`));