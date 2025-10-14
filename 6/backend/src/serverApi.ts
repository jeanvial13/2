import { Router } from 'express'
import { PrismaClient } from '@prisma/client'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'

const prisma = new PrismaClient()
const r = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret'
const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g,'_')
    cb(null, `${Date.now()}_${name}${ext}`)
  }
})
const upload = multer({ storage })

function authRequired(req, res, next) {
  const h = req.headers.authorization
  if (!h) return res.status(401).json({ error: 'No token' })
  const [, token] = h.split(' ')
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    req.user = payload
    next()
  } catch { return res.status(401).json({ error: 'Invalid token' }) }
}

// Auth
r.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  const user = await prisma.user.findUnique({ where: { username } })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = jwt.sign({ id: user.id, role: user.role, username: user.username }, JWT_SECRET, { expiresIn: '7d' })
  res.json({ id: user.id, username: user.username, role: user.role, token, createdAt: user.createdAt })
})

// Seed dev
r.post('/seed-dev', async (_req, res) => {
  const exists = await prisma.user.findFirst({ where: { username: 'admin' } })
  if (!exists) {
    const pw = await bcrypt.hash('admin123', 10)
    await prisma.user.create({ data: { username: 'admin', password: pw, role: 'admin' } })
    const dpw = await bcrypt.hash('demo123', 10)
    await prisma.user.create({ data: { username: 'demo', password: dpw, role: 'user' } })
  }
  res.json({ ok: true })
})

// Users
r.get('/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
  const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(users.map(u => ({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })))
})
r.post('/users', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
  const schema = z.object({ username: z.string().min(3), password: z.string().min(6), role: z.enum(['admin','user']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  try {
    const pw = await bcrypt.hash(parsed.data.password, 10)
    const u = await prisma.user.create({ data: { username: parsed.data.username, password: pw, role: parsed.data.role } })
    res.json({ id: u.id, username: u.username, role: u.role, createdAt: u.createdAt })
  } catch { return res.status(400).json({ error: 'username already exists' }) }
})
r.delete('/users/:id', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})
r.post('/users/:id/reset', authRequired, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'forbidden' })
  const { password } = req.body || {}
  const pw = await bcrypt.hash(String(password||''), 10)
  await prisma.user.update({ where: { id: req.params.id }, data: { password: pw } })
  res.json({ ok: true })
})

// Projects
const STAGES = ['Intake','Analysis','Feasibility','Approval','Development','UAT','Go-Live','Closed']

r.get('/projects', authRequired, async (req, res) => {
  const archived = req.query.archived === 'true'
  const ps = await prisma.project.findMany({ where: { archived }, include: { notes:true, history:true, attachments:true }, orderBy:{ createdAt: 'desc' } })
  res.json(ps)
})

r.post('/projects', authRequired, upload.array('attachments', 10), async (req, res) => {
  const b:any = req.body
  const raci = b.raci ? JSON.parse(b.raci) : { R:[],A:[],C:[],I:[] }
  const details = b.details ? JSON.parse(b.details) : []
  const id = String(b.id)
  const stage = STAGES.includes(b.stage) ? b.stage : 'Intake'
  const now = new Date()
  const p = await prisma.project.create({
    data: { id, title:b.title, owner:b.owner, responsible:b.responsible, stage, due:b.due, udDocument:b.udDocument||null, details, raci, history:{ create:[{ stage, enteredAt: now }] } },
    include: { notes:true, history:true, attachments:true }
  })
  const files = (req.files as any[]) || []
  if (files.length) {
    await prisma.attachment.createMany({ data: files.map(f => ({ projectId: p.id, filename:f.filename, original:f.originalname, mime:f.mimetype, size:f.size })) })
  }
  const full = await prisma.project.findUnique({ where:{ id:p.id }, include:{ notes:true, history:true, attachments:true } })
  res.json(full)
})

r.put('/projects/:id', authRequired, upload.array('attachments', 10), async (req, res) => {
  const id = req.params.id
  const b:any = req.body
  const patch:any = {}
  ;['title','owner','responsible','due','udDocument','blocked'].forEach(k => { if (b[k] !== undefined) patch[k] = b[k] })
  if (b.details) patch.details = JSON.parse(b.details)
  if (b.raci) patch.raci = JSON.parse(b.raci)
  await prisma.project.update({ where:{ id }, data: patch })
  const files = (req.files as any[]) || []
  if (files.length) {
    await prisma.attachment.createMany({ data: files.map(f => ({ projectId: id, filename:f.filename, original:f.originalname, mime:f.mimetype, size:f.size })) })
  }
  const full = await prisma.project.findUnique({ where:{ id }, include:{ notes:true, history:true, attachments:true } })
  res.json(full)
})

r.delete('/projects/:id', authRequired, async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

r.post('/projects/:id/stage', authRequired, async (req, res) => {
  const id = req.params.id
  const { next } = req.body || {}
  if (!STAGES.includes(next)) return res.status(400).json({ error: 'invalid stage' })
  const now = new Date()
  const project = await prisma.project.findUnique({ where: { id }, include: { history: true } })
  if (!project) return res.status(404).json({ error: 'not found' })
  const last = project.history.sort((a,b)=>a.enteredAt.getTime()-b.enteredAt.getTime())[project.history.length-1]
  if (last && !last.exitedAt) await prisma.history.update({ where: { id: last.id }, data: { exitedAt: now } })
  await prisma.project.update({ where: { id }, data: { stage: next } })
  await prisma.history.create({ data: { projectId: id, stage: next, enteredAt: now } })
  const full = await prisma.project.findUnique({ where: { id }, include: { notes:true, history:true, attachments:true } })
  res.json(full)
})

r.post('/projects/:id/note', authRequired, async (req, res) => {
  const id = req.params.id
  const { text } = req.body || {}
  await prisma.note.create({ data: { projectId: id, text } })
  const p = await prisma.project.findUnique({ where:{ id }, include:{ notes:true, attachments:true, history:true } })
  res.json(p)
})

r.post('/projects/:id/raci', authRequired, async (req, res) => {
  const id = req.params.id
  const raci = req.body
  const p = await prisma.project.update({ where: { id }, data: { raci } })
  res.json(p)
})

r.post('/projects/:id/archive', authRequired, async (req, res) => { const p = await prisma.project.update({ where:{ id:req.params.id }, data:{ archived:true } }); res.json(p) })
r.post('/projects/:id/unarchive', authRequired, async (req, res) => { const p = await prisma.project.update({ where:{ id:req.params.id }, data:{ archived:false } }); res.json(p) })

r.get('/projects/:id/attachments', authRequired, async (req, res)=>{
  const list = await prisma.attachment.findMany({ where: { projectId: req.params.id }, orderBy: { createdAt: 'desc' } })
  res.json(list)
})

export default r