import React from 'react'
import { UserCircleIcon } from '@heroicons/react/24/solid'

export default function Header({ user, onLogout }){
  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-bold">FS</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flowserve IT SEALS</h1>
          <p className="text-gray-500 text-sm -mt-1">Dashboard de registros</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {user ? (
          <div className="flex items-center gap-3">
            <UserCircleIcon className="w-8 h-8 text-gray-500" />
            <span className="badge">{user.username}</span>
            <span className="badge">{user.role}</span>
            <button className="btn-outline" onClick={onLogout}>Salir</button>
          </div>
        ) : <span className="text-sm text-gray-500">No autenticado</span>}
      </div>
    </header>
  )
}
