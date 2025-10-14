import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'
import api from './serverApi.js'
import path from 'path'

const app = express()
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*'
app.use(cors({ origin: CORS_ORIGIN, credentials: true }))

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
app.use('/api/uploads', express.static(uploadDir))

app.use('/api', api)

const httpServer = createServer(app)
const io = new Server(httpServer, { cors: { origin: CORS_ORIGIN, methods: ['GET','POST','PUT','DELETE'] } })
io.on('connection', (socket) => {
  socket.on('project:updated', (payload) => socket.broadcast.emit('project:updated', payload))
  socket.on('project:created', (payload) => socket.broadcast.emit('project:created', payload))
  socket.on('project:deleted', (payload) => socket.broadcast.emit('project:deleted', payload))
})

const PORT = 4000
httpServer.listen(PORT, () => console.log('API listening on ' + PORT))