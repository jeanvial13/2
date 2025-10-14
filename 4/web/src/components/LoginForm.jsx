import React, { useState } from 'react'

export default function LoginForm({ onSuccess }){
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    try{
      setLoading(true); setError('')
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })
      const j = await r.json().catch(()=>({ok:false}))
      if(j.ok){ onSuccess?.() } else { setError('Credenciales inválidas') }
    }finally{
      setLoading(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Acceso</h3>
      <div className="grid gap-3">
        <input className="border rounded-lg px-3 py-2" placeholder="Usuario" value={username} onChange={e=>setUsername(e.target.value)} />
        <input className="border rounded-lg px-3 py-2" type="password" placeholder="Contraseña" value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="btn-primary" onClick={submit} disabled={loading}>{loading?'Entrando...':'Entrar'}</button>
        {error && <p className="text-red-600 text-sm">{error}</p>}
      </div>
    </div>
  )
}
