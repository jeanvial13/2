import React from 'react'

export default function RecordTable({ rows }){
  return (
    <div className="overflow-auto">
      <table className="table">
        <thead>
          <tr>
            <th>ID</th><th>Usuario</th><th>Nombre</th><th>Email</th><th>Edad</th><th>Archivo</th><th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td>{r.id}</td>
              <td>{r.userId}</td>
              <td>{r.nombre}</td>
              <td>{r.email}</td>
              <td>{r.edad ?? ''}</td>
              <td>{r.archivo ? <a className="text-red-700 underline" href={`/api/files/${r.archivo}`} target="_blank" rel="noreferrer">Descargar</a> : ''}</td>
              <td>{r.fecha ? new Date(r.fecha).toLocaleString() : ''}</td>
            </tr>
          ))}
          {rows.length===0 && <tr><td className="text-gray-500" colSpan="7">Sin datos</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
