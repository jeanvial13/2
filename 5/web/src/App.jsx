import React, { useEffect, useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import LoginForm from './components/LoginForm.jsx'
import Formulario from './components/Formulario.jsx'
import RecordTable from './components/RecordTable.jsx'
import AdminUsers from './components/AdminUsers.jsx'
import DashboardKPIs from './components/DashboardKPIs.jsx'
import { motion } from 'framer-motion'

export default function App(){
  const [user, setUser] = useState(null)
  const [data, setData] = useState({ data: [], total: 0, page:1, pageSize:10 })
  const [viewAll, setViewAll] = useState(false)
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const authed = !!user

  const checkMe = async () => {
    const r = await fetch('/api/me', { credentials:'include' })
    setUser(r.ok ? (await r.json()).user : null)
  }

  const load = async () => {
    if (!authed) return
    const qs = new URLSearchParams()
    if (user?.role==='admin' && viewAll) qs.set('all','true')
    if (filter) qs.set('filter', filter)
    qs.set('page', page); qs.set('pageSize', pageSize)
    const r = await fetch(`/api/formularios?${qs.toString()}`, { credentials:'include' })
    if (r.ok) setData(await r.json())
  }

  useEffect(()=>{ checkMe() }, [])
  useEffect(()=>{ load() }, [authed, viewAll, filter, page, pageSize])

  const onLoggedIn = async () => { await checkMe(); setPage(1); await load() }
  const onLogout = async () => { await fetch('/api/logout', { method:'POST', credentials:'include' }); setUser(null); setData({data:[], total:0, page:1, pageSize:10}) }
  const onCreated = async () => { setPage(1); await load() }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <Header user={user} onLogout={onLogout} />
      {!authed ? (
        <motion.div initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="card max-w-md mx-auto mt-6">
          <LoginForm onSuccess={onLoggedIn} />
        </motion.div>
      ) : (
        <>
          <DashboardKPIs user={user} />
          <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="card mt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <input className="input" placeholder="Buscar nombre, email o edad..." value={filter} onChange={(e)=>{setPage(1); setFilter(e.target.value)}} />
                {user?.role==='admin' && (
                  <label className="text-sm flex items-center gap-2">
                    <input type="checkbox" checked={viewAll} onChange={e=>{setPage(1); setViewAll(e.target.checked)}}/> Ver todos (admin)
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                {user?.role==='admin' && (
                  <a className="btn-outline" href="/api/export/forms.csv" target="_blank" rel="noreferrer">Exportar CSV (formularios)</a>
                )}
                <select className="input" value={pageSize} onChange={e=>{setPage(1); setPageSize(parseInt(e.target.value))}}>
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
            <RecordTable rows={data.data} />
            <div className="flex items-center justify-between pt-3">
              <div className="text-sm text-gray-500">Total: {data.total}</div>
              <div className="flex items-center gap-2">
                <button className="btn-outline" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Anterior</button>
                <span className="text-sm">Página {page}</span>
                <button className="btn-outline" onClick={()=>setPage(p=>p+1)} disabled={(page*pageSize)>=data.total}>Siguiente</button>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{opacity:0, y:6}} animate={{opacity:1, y:0}} className="grid md:grid-cols-2 gap-6 mt-6">
            <div className="card"><Formulario onSuccess={onCreated} /></div>
            {user?.role==='admin' && <AdminUsers />}
          </motion.div>
        </>
      )}
    </div>
  )
}
