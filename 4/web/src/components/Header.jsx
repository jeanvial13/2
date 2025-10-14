import React from 'react'
import { motion } from 'framer-motion'

export default function Header({ user, onLogout }){
  return (
    <header className="flex items-center justify-between">
      <motion.div initial={{opacity:0, x:-8}} animate={{opacity:1, x:0}} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">FS</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flowserve IT SEALS</h1>
          <p className="text-gray-500 text-sm -mt-1">Panel de registros (Docker + React)</p>
        </div>
      </motion.div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="badge">{user.username}</span>
            <span className="badge">{user.role}</span>
            <button className="btn-outline" onClick={onLogout}>Salir</button>
          </div>
        ) : (
          <span className="text-sm text-gray-500">No autenticado</span>
        )}
      </div>
    </header>
  )
}
