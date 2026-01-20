'use client'
import React from 'react'

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  userCargo: string;
}

export function Sidebar({ activeTab, setActiveTab, userName, userCargo }: SidebarProps) {
  return (
    <div className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col p-6 gap-8 shadow-2xl z-20">
      <div className="bg-emerald-600 px-4 py-3 font-black text-white italic text-2xl rounded text-center shadow-lg uppercase tracking-tighter">ECOMINAS</div>
      <nav className="flex flex-col gap-2">
        <button onClick={() => setActiveTab('demandas')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'demandas' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white'}`}>📋 ESCRITÓRIO</button>
        <button onClick={() => setActiveTab('viagens')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'viagens' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white'}`}>🚗 VIAGENS</button>
      </nav>
      <div className="mt-auto border-t border-[#30363d] pt-6 uppercase text-[10px] font-black text-slate-400">
        <p className="text-white">{userName || 'CARREGANDO...'}</p>
        <p className="text-emerald-500 text-[8px]">{userCargo}</p>
      </div>
    </div>
  )
}