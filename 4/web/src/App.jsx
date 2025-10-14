import React, { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import LoginForm from './components/LoginForm.jsx'
import Formulario from './components/Formulario.jsx'
import RecordTable from './components/RecordTable.jsx'
import { motion } from 'framer-motion'

export default function App() {
  const [user, setUser] = useState(null)
  const [records, setRecords] = useState([])
  const [viewAll, setViewAll] = useState(false)
  const authed = !!user

  const checkMe = async () => {
    const r = await fetch('/api/me', { credentials: 'include' })
    if (r.ok) setUser((await r.json()).user)
    else setUser(null)
  }

  const load = async () => {
    if (!authed) return
    const r = await fetch(`/api/formularios${(viewAll && user?.role==='admin') ? '?all=true':''}`, { credentials: 'include' })
    if (r.ok) setRecords(await r.json())
  }

  useEffect(() => { checkMe() }, [])
  useEffect(() => { load() }, [authed, viewAll])

  const onLoggedIn = async () => { await checkMe(); await load() }
  const onLogout   = async () => { await fetch('/api/logout', { method:'POST', credentials:'include' }); setUser(null); setRecords([]) }
  const onCreated  = async () => { await load() }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <Header user={user} onLogout={onLogout} />

      {!authed ? (
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="card max-w-md mx-auto mt-6">
          <LoginForm onSuccess={onLoggedIn} />
        </motion.div>
      ) : (
        <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="grid md:grid-cols-2 gap-6 mt-6">
          <div className="card">
            <Formulario onSuccess={onCreated} />
          </div>
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Registros</h3>
              {user?.role === 'admin' && (
                <label className="text-sm flex items-center gap-2">
                  <input type="checkbox" checked={viewAll} onChange={e=>setViewAll(e.target.checked)} />
                  Ver todos (admin)
                </label>
              )}
            </div>
            <RecordTable rows={records} />
          </div>
        </motion.div>
      )}
    </div>
  )
}
