import React, { useEffect, useState } from 'react'

export default function AdminUsers(){
  const [users, setUsers] = useState([])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [q, setQ] = useState('')

  const load = async () => {
    const r = await fetch('/api/users', { credentials:'include' })
    if (r.ok) setUsers(await r.json())
  }
  useEffect(()=>{ load() }, [])

  const add = async () => {
    const r = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ username, password, role }) })
    const j = await r.json().catch(()=>({ok:false}))
    if (j.ok){ setUsername(''); setPassword(''); setRole('user'); load() } else alert(j.error||'Error')
  }
  const resetPass = async (id) => {
    const pwd = prompt('Nueva contraseña:'); if (!pwd) return;
    const r = await fetch(`/api/users/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ password: pwd }) })
    const j = await r.json().catch(()=>({ok:false})); if (!j.ok) alert('Error'); else alert('Contraseña actualizada');
  }
  const changeRole = async (id, newRole) => {
    const r = await fetch(`/api/users/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, credentials:'include', body: JSON.stringify({ role:newRole }) })
    const j = await r.json().catch(()=>({ok:false})); if (!j.ok) alert('Error'); load()
  }
  const delUser = async (id) => {
    if (!confirm('¿Eliminar usuario?')) return;
    const r = await fetch(`/api/users/${id}`, { method:'DELETE', credentials:'include' })
    const j = await r.json().catch(()=>({ok:false})); if (!j.ok) alert(j.error||'Error'); load()
  }

  const filtered = users.filter(u => u.username.toLowerCase().includes(q.toLowerCase()))

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Gestión de usuarios (admin)</h3>
      <div className="grid md:grid-cols-5 gap-3 mb-4">
        <input className="input" placeholder="Usuario" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
        <select className="input" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button className="btn-primary" onClick={add}>Crear usuario</button>
        <input className="input" placeholder="Buscar..." value={q} onChange={e=>setQ(e.target.value)} />
      </div>
      <div className="flex items-center justify-end mb-2">
        <a className="btn-outline" href="/api/export/users.csv" target="_blank" rel="noreferrer">Exportar CSV (usuarios)</a>
      </div>
      <div className="overflow-auto">
        <table className="table">
          <thead><tr><th>ID</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr></thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.username}</td>
                <td>
                  <select className="input" value={u.role} onChange={e=>changeRole(u.id, e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
                <td className="space-x-2">
                  <button className="btn-outline" onClick={()=>resetPass(u.id)}>Reset pass</button>
                  <button className="btn-outline" onClick={()=>delUser(u.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
