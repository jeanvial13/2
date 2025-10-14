import { http } from './lib/api'
export async function apiLogin(username:string, password:string){
  const { data } = await http.post('/login', { username, password })
  localStorage.setItem('token', data.token)
  localStorage.setItem('user', JSON.stringify({ id: data.id, username: data.username, role: data.role, createdAt: data.createdAt }))
  ;(http.defaults.headers as any).common['Authorization'] = `Bearer ${data.token}`
  return { id: data.id, username: data.username, role: data.role, createdAt: data.createdAt }
}
export function apiLogout(){ localStorage.removeItem('token'); localStorage.removeItem('user'); delete (http.defaults.headers as any).common?.Authorization }
export const api = {
  projects: {
    list: async ({ archived = false }:{ archived: boolean }) => (await http.get('/projects', { params: { archived } })).data,
    create: async (payload:any) => { const fd = new FormData(); Object.entries(payload).forEach(([k,v]:any)=>{ if(k==='details'||k==='raci') fd.append(k, JSON.stringify(v)); else if(k==='attachments'&&Array.isArray(v)) v.forEach((f:File)=>fd.append('attachments', f)); else if(v!==undefined&&v!==null) fd.append(k, v as any) }); return (await http.post('/projects', fd)).data },
    update: async (id:string, patch:any) => { const fd = new FormData(); Object.entries(patch).forEach(([k,v]:any)=>{ if(k==='details'||k==='raci') fd.append(k, JSON.stringify(v)); else if(k==='attachments'&&Array.isArray(v)) v.forEach((f:File)=>fd.append('attachments', f)); else if(v!==undefined&&v!==null) fd.append(k, v as any) }); return (await http.put(`/projects/${id}`, fd)).data },
    del: async (id:string) => { await http.delete(`/projects/${id}`) },
    stage: async (id:string, next:string) => (await http.post(`/projects/${id}/stage`, { next })).data,
    note: async (id:string, text:string) => (await http.post(`/projects/${id}/note`, { text })).data,
    raci: async (id:string, raci:any) => (await http.post(`/projects/${id}/raci`, raci)).data,
    archive: async (id:string) => (await http.post(`/projects/${id}/archive`)).data,
    unarchive: async (id:string) => (await http.post(`/projects/${id}/unarchive`)).data,
    attachments: async (id:string) => (await http.get(`/projects/${id}/attachments`)).data,
  },
  users: {
    list: async () => (await http.get('/users')).data,
    create: async (username:string, password:string, role:'admin'|'user') => (await http.post('/users', { username, password, role })).data,
    del: async (id:string) => (await http.delete(`/users/${id}`)).data,
    reset: async (id:string, password:string) => (await http.post(`/users/${id}/reset`, { password })).data,
  }
}