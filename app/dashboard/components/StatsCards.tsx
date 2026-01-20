'use client'
import React from 'react'

interface StatsProps {
  stats: {
    abertas: number;
    concluidas: number;
    atrasadas: number;
  }
}

export function StatsCards({ stats }: StatsProps) {
  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="bg-[#161b22] p-6 rounded border border-[#30363d] shadow-xl text-left border-l-4 border-emerald-600">
        <p className="text-[9px] font-black text-emerald-500 mb-1 tracking-widest uppercase italic">Em Aberto</p>
        <p className="text-4xl font-black text-white">{stats.abertas}</p>
      </div>
      <div className="bg-[#161b22] p-6 rounded border border-[#30363d] shadow-xl text-left border-l-4 border-blue-600">
        <p className="text-[9px] font-black text-blue-500 mb-1 tracking-widest uppercase italic">Concluídas</p>
        <p className="text-4xl font-black text-white">{stats.concluidas}</p>
      </div>
      <div className="bg-[#161b22] p-6 rounded border border-[#30363d] shadow-xl text-left border-l-4 border-red-600">
        <p className="text-[9px] font-black text-red-600 mb-1 tracking-widest uppercase italic">Atrasadas</p>
        <p className="text-4xl font-black text-white">{stats.atrasadas}</p>
      </div>
    </div>
  )
}