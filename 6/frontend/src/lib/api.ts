import axios from 'axios'
export const http = axios.create({ baseURL: import.meta.env.VITE_API_BASE || '/api' })
export function setToken(token?: string){ if(token) (http.defaults.headers as any).common['Authorization'] = `Bearer ${token}`; else delete (http.defaults.headers as any).common?.Authorization }
