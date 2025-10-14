import React from 'react'
const apiBase = import.meta.env.VITE_API_BASE || '/api'
export default function App(){const [health,setHealth]=React.useState('checking...');React.useEffect(()=>{fetch(`${apiBase}/health`).then(r=>r.json()).then(d=>setHealth(d.status)).catch(()=>setHealth('offline'))},[]);return (<div style={{fontFamily:'system-ui, sans-serif', padding:20}}><h1>Flowboard</h1><p>Frontend listo. API status: <b>{health}</b></p></div>)}
