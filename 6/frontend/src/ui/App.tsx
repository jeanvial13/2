import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Dialog } from '@headlessui/react'
import { Plus, Trash2, Info, Paperclip } from 'lucide-react'
import io from 'socket.io-client'
import { apiLogin, apiLogout, api } from '../api'
import { http } from '../lib/api'

type Stage = 'Intake'|'Analysis'|'Feasibility'|'Approval'|'Development'|'UAT'|'Go-Live'|'Closed'
type Note = { id: string; text: string; createdAt: string|null|undefined }
type Raci = { R: string[]; A: string[]; C: string[]; I: string[] }
type Attachment = { id:string; filename:string; original:string; mime:string; size:number; createdAt:string }
type Project = { id:string; title:string; owner:string; responsible:string; stage:Stage; due:string; udDocument?:string|null; createdAt:string|null|undefined; lastUpdateAt:string|null|undefined; blocked:boolean; details:string[]; notes:Note[]; raci:Raci; archived:boolean; attachments:Attachment[]; history:any[] }
type Role = 'admin'|'user'
type User = { id:string; username:string; role:Role; createdAt?:string }

const STAGES: Stage[] = ['Intake','Analysis','Feasibility','Approval','Development','UAT','Go-Live','Closed']
const nowIso = () => new Date().toISOString()
const daysBetween = (a?: string|null, b?: string|null) => { if (!a) return 0; const t1 = Date.parse(a), t2 = Date.parse(b||nowIso()); if (!Number.isFinite(t1)||!Number.isFinite(t2)) return 0; return Math.floor(Math.max(0, t2-t1)/(1000*60*60*24)) }

export default function App(){
  const [projects, setProjects] = useState<Project[]>([])
  const [archived, setArchived] = useState<Project[]>([])
  const [query, setQuery] = useState('')
  const [isNewOpen, setIsNewOpen] = useState(false)
  const [details, setDetails] = useState<Project|null>(null)
  const [usersOpen, setUsersOpen] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [currentUser, setCurrentUser] = useState<User|null>(()=>{ try{ const u=localStorage.getItem('user'); return u? JSON.parse(u): null }catch{ return null } })

  useEffect(()=>{
    const t = localStorage.getItem('token'); if (t) (http.defaults.headers as any).common['Authorization']=`Bearer ${t}`
    ;(async ()=>{ try{ await http.post('/seed-dev') }catch{} await loadAll() })()
    const s = io('/', { path: '/socket.io' }); s.on('project:updated', ()=>loadAll()); s.on('project:created', ()=>loadAll()); s.on('project:deleted', ()=>loadAll()); return ()=>s.close()
  },[])

  async function loadAll(){ try{ setProjects(await api.projects.list({ archived:false })); setArchived(await api.projects.list({ archived:true })) }catch{} }
  async function login(u:string,p:string){ const user=await apiLogin(u,p); setCurrentUser(user); await loadAll() }
  function logout(){ apiLogout(); setCurrentUser(null); setProjects([]); setArchived([]) }
  async function createProject(p:any){ const created = await api.projects.create(p); setProjects(prev=>[created,...prev]) }
  async function updateProject(id:string, patch:any){ const up = await api.projects.update(id, patch); setProjects(prev=>prev.map(p=>p.id===id? up: p)) }
  async function delProject(id:string){ await api.projects.del(id); setProjects(prev=>prev.filter(p=>p.id!==id)) }
  async function changeStage(p:Project, next:Stage){ const up = await api.projects.stage(p.id, next); setProjects(prev=>prev.map(x=>x.id===p.id? up: x)) }
  async function addNote(p:Project, text:string){ const up = await api.projects.note(p.id, text); setProjects(prev=>prev.map(x=>x.id===p.id? up: x)) }
  async function setRaci(id:string, raci:Raci){ await api.projects.raci(id, raci); await loadAll() }
  async function archiveProject(p:Project){ const up = await api.projects.archive(p.id); setProjects(pr=>pr.filter(x=>x.id!==p.id)); setArchived(a=>[up,...a]) }
  async function unarchiveProject(p:Project){ const up = await api.projects.unarchive(p.id); setArchived(a=>a.filter(x=>x.id!==p.id)); setProjects(pr=>[up,...pr]) }

  const filtered = useMemo(()=>{
    const s=query.trim().toLowerCase(); if(!s) return projects
    const inArr=(arr:string[])=>arr.some(v=>v.toLowerCase().includes(s))
    return projects.filter(p=> p.id.toLowerCase().includes(s)||p.title.toLowerCase().includes(s)||p.owner.toLowerCase().includes(s)||p.responsible.toLowerCase().includes(s)||p.stage.toLowerCase().includes(s)||(p.udDocument||'').toLowerCase().includes(s)||p.due.toLowerCase().includes(s)||inArr(p.details)||inArr(p.raci.R)||inArr(p.raci.A)||inArr(p.raci.C)||inArr(p.raci.I)||p.notes.some(n=>n.text.toLowerCase().includes(s)))
  },[projects,query])

  if (!currentUser) return <Login onLogin={login} />

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="flex flex-wrap gap-3 justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Flowboard</h1>
        <div className="flex-1 max-w-lg"><input value={query} onChange={e=>setQuery(e.target.value)} className="w-full border rounded-xl px-3 py-2" placeholder="Buscar (id, title, RACI, notas…)" /></div>
        <div className="flex items-center gap-2">
          {currentUser.role==='admin' && <button onClick={async ()=>{ setUsers(await api.users.list()); setUsersOpen(true) }} className="px-3 py-2 rounded-xl bg-white border">Users</button>}
          <button onClick={()=>setIsNewOpen(true)} className="px-4 py-2 rounded-xl bg-red-600 text-white flex items-center gap-2"><Plus className="w-4 h-4" /> New</button>
          <button onClick={logout} className="px-3 py-2 rounded-xl bg-white border">Logout</button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {STAGES.map(stage=>(
          <div key={stage} className="bg-white rounded-xl p-3 shadow-sm border">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{stage}</h3>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{filtered.filter(p=>p.stage===stage).length}</span>
            </div>
            <div className="h-[72vh] overflow-auto mt-2 pr-1">
              {filtered.filter(p=>p.stage===stage).map(p=>{
                const daysSinceAnyChange = daysBetween(p.lastUpdateAt || p.createdAt, nowIso())
                const border = daysSinceAnyChange >= 3 ? 'border-rose-500' : 'border-gray-200'
                return (
                  <div key={p.id} className={`bg-gray-50 p-3 rounded-lg border-2 ${border} hover:shadow mb-3`}>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs font-semibold">{p.title}</span>
                      <span className="flex items-center gap-1">{p.attachments.length>0 && <Paperclip className="w-3 h-3 text-gray-600" />}<span className="text-xs text-gray-400">{p.due}</span></span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">Owner: {p.owner} • Resp: {p.responsible}</div>
                    <ul className="list-disc ml-4 text-xs text-gray-700 mt-2">{p.details.map((d,i)=><li key={i}>{d}</li>)}</ul>
                    <div className="flex flex-wrap justify-between items-center gap-2 mt-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={()=>setDetails(p)} className="text-xs bg-white border px-2 py-1 rounded-lg flex items-center gap-1"><Info className="w-3 h-3" />Details</button>
                        {currentUser.role==='admin' && (<><button onClick={()=>archiveProject(p)} className="text-xs bg-white border px-2 py-1 rounded-lg">Archive</button><button onClick={()=>{ if(confirm(`Delete ${p.id}?`)) delProject(p.id) }} className="text-xs bg-white border px-2 py-1 rounded-lg text-rose-600 flex items-center gap-1"><Trash2 className="w-3 h-3" />Delete</button></>)}
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-gray-600">Stage</label>
                        <select value={p.stage} onChange={e=>changeStage(p, e.target.value as Stage)} className="text-xs border rounded-md px-2 py-1">{STAGES.map(s=><option key={s}>{s}</option>)}</select>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <button onClick={()=>updateProject(p.id, { blocked: !p.blocked })} className={`text-[11px] px-2 py-0.5 rounded ${p.blocked? 'bg-rose-600 text-white':'bg-gray-200'}`}>{p.blocked? 'Unblock':'Mark Blocked'}</button>
                      <button onClick={()=>setDetails(p)} className="text-[11px] px-2 py-0.5 rounded bg-gray-200">RACI</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <NewProjectModal open={isNewOpen} onClose={()=>setIsNewOpen(false)} onCreate={async (data)=>{ const id = `IT-${Math.floor(Math.random()*900+100)}`; await createProject({ id, ...data }); setIsNewOpen(false) }} />
      <ProjectDetailsModal project={details} onClose={()=>setDetails(null)} onAddNote={(p,t)=>addNote(p,t)} onUpload={async (p, files)=>{ await updateProject(p.id, { attachments: Array.from(files) }) }} onSaveRaci={(p, raci)=>setRaci(p.id, raci)} />

      <UsersAdminModal open={usersOpen} onClose={()=>setUsersOpen(false)} users={users}
        onCreate={async (u,p,r)=>{ await api.users.create(u,p,r); setUsers(await api.users.list()) }}
        onDelete={async (id)=>{ await api.users.del(id); setUsers(await api.users.list()) }}
        onReset={async (id,pw)=>{ await api.users.reset(id,pw); alert('Password updated') }}
      />
    </div>
  )
}

function Login({ onLogin }:{ onLogin:(u:string,p:string)=>Promise<void> }){
  const [u,setU]=useState('admin'); const [p,setP]=useState('admin123'); const [err,setErr]=useState<string|null>(null)
  return (<div className="min-h-screen grid place-items-center bg-gray-50 p-6"><div className="bg-white p-6 rounded-xl shadow max-w-sm w-full"><h1 className="text-xl font-semibold mb-3">Sign in</h1><div className="space-y-2"><input className="border rounded-lg p-2 w-full" placeholder="Username" value={u} onChange={e=>setU(e.target.value)} /><input className="border rounded-lg p-2 w-full" placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)} /></div>{err && <div className="text-sm text-rose-600 mt-2">{err}</div>}<div className="mt-4 text-right"><button onClick={async ()=>{ setErr(null); try{ await onLogin(u,p) }catch{ setErr('Login failed') } }} className="px-4 py-2 rounded bg-red-600 text-white">Sign in</button></div></div></div>)
}

function NewProjectModal({ open, onClose, onCreate }:{ open:boolean; onClose:()=>void; onCreate:(data:any)=>void }){
  const [stage,setStage]=useState<Stage>('Intake'); const [attachments, setAttachments] = useState<File[]>([])
  return !open? null : (
    <Dialog open={open} onClose={onClose} className="relative z-50"><div className="fixed inset-0 bg-black/30" aria-hidden="true" /><div className="fixed inset-0 flex items-center justify-center p-4"><Dialog.Panel className="bg-white p-6 rounded-xl shadow max-w-2xl w-full"><Dialog.Title className="text-lg font-semibold mb-4">New Project</Dialog.Title><form className="grid grid-cols-1 md:grid-cols-2 gap-3" onSubmit={(e)=>{ e.preventDefault(); const fd = new FormData(e.currentTarget as HTMLFormElement); const raci={ R:String(fd.get('raciR')||'').split(',').map(x=>x.trim()).filter(Boolean), A:String(fd.get('raciA')||'').split(',').map(x=>x.trim()).filter(Boolean), C:String(fd.get('raciC')||'').split(',').map(x=>x.trim()).filter(Boolean), I:String(fd.get('raciI')||'').split(',').map(x=>x.trim()).filter(Boolean) }; onCreate({ title:String(fd.get('title')||''), owner:String(fd.get('owner')||''), responsible:String(fd.get('responsible')||''), stage, due:String(fd.get('due')||''), udDocument: stage==='Analysis'? String(fd.get('ud')||'') : undefined, details: [String(fd.get('details')||'')].filter(Boolean), raci, attachments }) }}><input name="title" placeholder="Project title" required className="border p-2 rounded-lg" /><input name="owner" placeholder="Requester / Owner" required className="border p-2 rounded-lg" /><input name="responsible" placeholder="Project Lead (Responsible)" required className="border p-2 rounded-lg" /><select name="stage" value={stage} onChange={e=>setStage(e.target.value as Stage)} className="border p-2 rounded-lg">{STAGES.map(s=><option key={s}>{s}</option>)}</select><input name="due" type="date" required className="border p-2 rounded-lg" />{stage==='Analysis' && <input name="ud" placeholder="UD Document (code or link)" className="border p-2 rounded-lg md:col-span-2" />}<textarea name="details" placeholder="Notes…" className="border p-2 rounded-lg md:col-span-2" /><div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-3"><div><label className="text-sm font-medium">RACI – Responsible (R)</label><input name="raciR" className="border p-2 rounded w-full" placeholder="comma,separated" /></div><div><label className="text-sm font-medium">Accountable (A)</label><input name="raciA" className="border p-2 rounded w-full" placeholder="comma,separated" /></div><div><label className="text-sm font-medium">Consulted (C)</label><input name="raciC" className="border p-2 rounded w-full" placeholder="comma,separated" /></div><div><label className="text-sm font-medium">Informed (I)</label><input name="raciI" className="border p-2 rounded w-full" placeholder="comma,separated" /></div></div><div className="md:col-span-2"><label className="text-sm font-medium block mb-1">Adjuntar archivos</label><input type="file" multiple onChange={e=>setAttachments(Array.from(e.target.files||[]))} /></div><div className="md:col-span-2 flex gap-2 justify-end pt-2"><button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button><button type="submit" className="px-4 py-2 rounded-lg bg-red-600 text-white">Save</button></div></form></Dialog.Panel></div></Dialog>
  )
}

function ProjectDetailsModal({ project, onClose, onAddNote, onUpload, onSaveRaci }:{ project:Project|null; onClose:()=>void; onAddNote:(p:Project,text:string)=>void; onUpload:(p:Project, files:FileList)=>void; onSaveRaci:(p:Project, raci:Raci)=>void }){
  const [note,setNote]=useState('')
  const [R,setR]=useState(''),[A,setA]=useState(''),[C,setC]=useState(''),[I,setI]=useState('')
  useEffect(()=>{ if(project){ setR(project.raci.R.join(', ')); setA(project.raci.A.join(', ')); setC(project.raci.C.join(', ')); setI(project.raci.I.join(', ')); } },[project])
  if(!project) return null
  const parse=(s:string)=>s.split(',').map(x=>x.trim()).filter(Boolean)
  return (<Dialog open={!!project} onClose={onClose} className="relative z-50"><div className="fixed inset-0 bg-black/30" aria-hidden="true" /><div className="fixed inset-0 flex items-center justify-center p-4"><Dialog.Panel className="bg-white p-6 rounded-xl shadow max-w-3xl w-full"><Dialog.Title className="text-lg font-semibold mb-2 flex items-center gap-2"><Info className="w-5 h-5 text-red-600" /> {project.title} ({project.id})</Dialog.Title><div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm"><div className="bg-gray-50 p-3 rounded"><div><span className="font-semibold">Requester:</span> {project.owner}</div><div><span className="font-semibold">Responsible:</span> {project.responsible}</div><div><span className="font-semibold">Stage:</span> {project.stage}</div><div><span className="font-semibold">Due:</span> {project.due}</div>{project.udDocument && <div><span className="font-semibold">UD Document:</span> {project.udDocument}</div>}<div className="mt-2"><span className="font-semibold">Attachments:</span><ul className="mt-1 space-y-1 max-h-40 overflow-auto">{project.attachments.length===0 && <li className="text-gray-500">No attachments</li>}{project.attachments.map(a=>(<li key={a.id} className="text-gray-700 flex items-center gap-2"><Paperclip className="w-4 h-4" /><a href={`/api/uploads/${a.filename}`} target="_blank" className="underline">{a.original}</a><span className="text-xs text-gray-400">({Math.round(a.size/1024)} KB)</span></li>))}</ul><div className="mt-2"><label className="text-sm font-medium">Adjuntar más</label><input type="file" multiple onChange={e=>e.target.files&&onUpload(project, e.target.files)} /></div></div></div><div><span className="font-semibold">Notes</span><ul className="mt-1 max-h-48 overflow-auto bg-gray-50 rounded p-2 space-y-2">{project.notes.length===0 && <li className="text-gray-500 text-sm">No notes yet.</li>}{project.notes.map(n=>(<li key={n.id} className="bg-white border rounded p-2"><div className="text-xs text-gray-500">{new Date(n.createdAt||'').toLocaleString()}</div><div className="text-gray-800">{n.text}</div></li>))}</ul><div className="flex gap-2 mt-2"><input value={note} onChange={e=>setNote(e.target.value)} placeholder="Add a note…" className="border p-2 rounded w-full" /><button onClick={()=>{ if(note.trim()) onAddNote(project, note.trim()); setNote('') }} className="px-3 py-2 rounded bg-red-600 text-white">Add</button></div><div className="grid grid-cols-2 gap-2 mt-3"><input value={R} onChange={e=>setR(e.target.value)} className="border p-2 rounded" placeholder="R (comma separated)" /><input value={A} onChange={e=>setA(e.target.value)} className="border p-2 rounded" placeholder="A (comma separated)" /><input value={C} onChange={e=>setC(e.target.value)} className="border p-2 rounded" placeholder="C (comma separated)" /><input value={I} onChange={e=>setI(e.target.value)} className="border p-2 rounded" placeholder="I (comma separated)" /><button onClick={()=>onSaveRaci(project, { R:parse(R), A:parse(A), C:parse(C), I:parse(I) })} className="col-span-2 px-3 py-2 rounded bg-gray-200">Save RACI</button></div></div></div><div className="mt-4 text-right"><button onClick={onClose} className="bg-red-600 text-white px-4 py-2 rounded-lg">Close</button></div></Dialog.Panel></div></Dialog>)
}

function UsersAdminModal({ open, onClose, users, onCreate, onDelete, onReset }:{ open:boolean; onClose:()=>void; users:User[]; onCreate:(u:string,p:string,r:Role)=>Promise<void>; onDelete:(id:string)=>Promise<void>; onReset:(id:string,pw:string)=>Promise<void> }){
  const [username,setUsername]=useState(''); const [password,setPassword]=useState(''); const [role,setRole]=useState<Role>('user'); const [error,setError]=useState<string|null>(null)
  if(!open) return null
  return (<Dialog open={open} onClose={onClose} className="relative z-50"><div className="fixed inset-0 bg-black/30" aria-hidden="true" /><div className="fixed inset-0 flex items-center justify-center p-4"><Dialog.Panel className="bg-white p-6 rounded-xl shadow max-w-2xl w-full"><Dialog.Title className="text-lg font-semibold mb-4">User management</Dialog.Title><div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4"><input className="border p-2 rounded" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)} /><input className="border p-2 rounded" placeholder="Temporary password" type="password" value={password} onChange={e=>setPassword(e.target.value)} /><select className="border p-2 rounded" value={role} onChange={e=>setRole(e.target.value as Role)}><option value="user">User</option><option value="admin">Admin</option></select><div className="md:col-span-3 text-right"><button className="px-3 py-2 rounded bg-red-600 text-white" onClick={async ()=>{ setError(null); try{ await onCreate(username, password, role); setUsername(''); setPassword(''); setRole('user') }catch{ setError('Create user failed') } }}>Create user</button></div></div>{error && <div className="text-sm text-rose-600 mb-2">{error}</div>}<table className="w-full text-sm"><thead><tr className="text-left text-gray-600"><th className="p-2">Username</th><th className="p-2">Role</th><th className="p-2">Created</th><th className="p-2">Actions</th></tr></thead><tbody>{users.map(u=>(<tr key={u.id} className="border-t"><td className="p-2">{u.username}</td><td className="p-2">{u.role}</td><td className="p-2">{u.createdAt? new Date(u.createdAt).toLocaleString():'-'}</td><td className="p-2 flex flex-wrap gap-2"><button onClick={async ()=>{ const np = prompt(`New password for "${u.username}":`); if(!np) return; await onReset(u.id, np) }} className="text-xs px-2 py-1 rounded bg-gray-100">Reset password</button><button onClick={async ()=>{ if(!confirm(`Delete user "${u.username}"?`)) return; await onDelete(u.id) }} className="text-xs px-2 py-1 rounded bg-rose-600 text-white">Delete</button></td></tr>))}</tbody></table><div className="mt-4 text-right"><button onClick={onClose} className="px-4 py-2 rounded bg-gray-100">Close</button></div></Dialog.Panel></div></Dialog>)
}