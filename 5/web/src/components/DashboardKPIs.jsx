import React, { useEffect, useState } from 'react'
import { ChartBarIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/solid'

export default function DashboardKPIs({ user }){
  const [stats, setStats] = useState({ totalForms: 0, totalUsers: 0, lastFormDate: null })
  useEffect(()=>{
    (async ()=>{
      const r = await fetch('/api/stats', { credentials:'include' })
      if (r.ok) setStats(await r.json())
    })()
  }, [])

  return (
    <div className="grid md:grid-cols-3 gap-4 mt-6">
      <div className="kpi">
        <div className="kpi-icon"><ChartBarIcon className="w-7 h-7"/></div>
        <div>
          <div className="text-sm text-gray-500">Total formularios</div>
          <div className="text-2xl font-semibold">{stats.totalForms}</div>
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-icon"><UserGroupIcon className="w-7 h-7"/></div>
        <div>
          <div className="text-sm text-gray-500">Usuarios</div>
          <div className="text-2xl font-semibold">{stats.totalUsers}</div>
        </div>
      </div>
      <div className="kpi">
        <div className="kpi-icon"><ClockIcon className="w-7 h-7"/></div>
        <div>
          <div className="text-sm text-gray-500">Última actividad</div>
          <div className="text-2xl font-semibold">{stats.lastFormDate ? new Date(stats.lastFormDate).toLocaleString() : '—'}</div>
        </div>
      </div>
    </div>
  )
}
