import fs from 'fs'
import path from 'path'
try {
  const dist = path.join(process.cwd(), 'dist')
  const target = '/frontend_dist'
  if (fs.existsSync(dist) && fs.existsSync(target)) {
    fs.cpSync(dist, target, { recursive: true })
    console.log('Dist copiado a', target)
  }
} catch (e) { console.log('postbuild notice:', e.message) }