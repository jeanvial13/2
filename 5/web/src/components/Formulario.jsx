import React, { useState } from 'react'

export default function Formulario({ onSuccess }){
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [edad, setEdad] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState('')

  const send = async () => {
    const fd = new FormData()
    fd.append('nombre', nombre)
    fd.append('email', email)
    fd.append('edad', edad)
    if (archivo) fd.append('archivo', archivo)
    setSending(true); setStatus('')
    const r = await fetch('/api/formulario', { method:'POST', body: fd, credentials:'include' })
    const j = await r.json().catch(()=>({ok:false}))
    if(j.ok){
      setNombre(''); setEmail(''); setEdad(''); setArchivo(null);
      setStatus('✔️ Enviado'); onSuccess?.()
    } else setStatus('❌ Error')
    setSending(false)
  }

  return (
    <div>
      <h3 className="text-lg font-semibold mb-3">Formulario</h3>
      <div className="grid gap-3">
        <input className="input" placeholder="Nombre" value={nombre} onChange={e=>setNombre(e.target.value)} />
        <input className="input" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="input" type="number" placeholder="Edad" value={edad} onChange={e=>setEdad(e.target.value)} />
        <input className="input" type="file" onChange={e=>setArchivo(e.target.files[0])} />
        <button className="btn-outline" onClick={send} disabled={sending}>{sending?'Enviando...':'Enviar'}</button>
        {status && <div className="text-sm text-gray-600">{status}</div>}
      </div>
    </div>
  )
}
