'use client'
import React, { useState } from 'react'
import { 
  Briefcase, 
  Car, 
  ChevronLeft, 
  ChevronRight, 
  UserCircle
} from 'lucide-react'

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userName: string;
  userCargo: string;
}

export function Sidebar({ activeTab, setActiveTab, userName, userCargo }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div 
      className={`
        relative flex flex-col bg-[#0d1117] border-r border-[#30363d] 
        transition-all duration-300 ease-in-out z-20 shadow-2xl
        ${isCollapsed ? 'w-20' : 'w-72'} 
      `}
    >
      {/* BOTÃO DE RETRAÇÃO */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 bg-[#161b22] border border-[#30363d] rounded-full p-1.5 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 transition-colors shadow-md z-50 flex items-center justify-center"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* --- ÁREA DA LOGO --- */}
      <div className={`h-24 flex items-center ${isCollapsed ? 'justify-center' : 'px-6'} transition-all duration-300`}>
        <div className="flex items-center gap-4 overflow-hidden">
          
          {/* AQUI ESTÁ A SUA LOGO */}
          {/* Certifique-se de ter o arquivo logo.png na pasta public */}
          <img 
            src="/logo-ecominas.png" 
            alt="Logo Ecominas" 
            className="w-10 h-10 object-contain shrink-0" 
          />
          
          {/* Texto da Logo (Some suavemente ao fechar) */}
          <div className={`transition-all duration-300 flex flex-col justify-center whitespace-nowrap ${isCollapsed ? 'w-0 opacity-0' : 'w-40 opacity-100'}`}>
            <h1 className="font-black text-white italic text-xl tracking-tighter leading-none">ECOMINAS</h1>
            <p className="text-[9px] text-emerald-500 font-bold tracking-[0.2em] uppercase leading-tight mt-1">Sistema Integrado</p>
          </div>
        </div>
      </div>

      {/* --- NAVEGAÇÃO --- */}
      <nav className="flex-1 px-3 space-y-2 mt-4">
        
        {/* BOTÃO ESCRITÓRIO */}
        <button 
          onClick={() => setActiveTab('demandas')} 
          title={isCollapsed ? "Escritório" : ""}
          className={`
            w-full flex items-center h-12 rounded-lg font-bold text-[11px] transition-all group relative overflow-hidden
            ${activeTab === 'demandas' 
              ? 'bg-gradient-to-r from-emerald-600/10 to-transparent text-emerald-400 border-l-[3px] border-emerald-500' 
              : 'text-slate-400 hover:bg-[#161b22] hover:text-white'}
            ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}
          `}
        >
          <Briefcase size={20} className={`shrink-0 ${activeTab === 'demandas' ? 'stroke-[2.5px]' : ''}`} />
          
          <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 translate-x-10 absolute' : 'w-auto opacity-100 translate-x-0 relative'}`}>
            ESCRITÓRIO
          </span>
        </button>

        {/* BOTÃO VIAGENS */}
        <button 
          onClick={() => setActiveTab('viagens')} 
          title={isCollapsed ? "Logística de Viagens" : ""}
          className={`
            w-full flex items-center h-12 rounded-lg font-bold text-[11px] transition-all group relative overflow-hidden
            ${activeTab === 'viagens' 
              ? 'bg-gradient-to-r from-emerald-600/10 to-transparent text-emerald-400 border-l-[3px] border-emerald-500' 
              : 'text-slate-400 hover:bg-[#161b22] hover:text-white'}
            ${isCollapsed ? 'justify-center px-0' : 'px-4 gap-4'}
          `}
        >
          <Car size={20} className={`shrink-0 ${activeTab === 'viagens' ? 'stroke-[2.5px]' : ''}`} />
          
          <span className={`whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 translate-x-10 absolute' : 'w-auto opacity-100 translate-x-0 relative'}`}>
            CAMPO
          </span>
        </button>

      </nav>

      {/* --- RODAPÉ DO USUÁRIO --- */}
      <div className="p-4 border-t border-[#30363d] bg-[#0a0c10]/50 overflow-hidden">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} transition-all`}>
          
          {/* Avatar */}
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
            <UserCircle size={20} />
          </div>
          
          {/* Info Texto */}
          <div className={`flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <p className="text-white text-[11px] font-black leading-tight uppercase truncate max-w-[140px]">
              {userName || 'USUÁRIO'}
            </p>
            <p className="text-emerald-600 text-[9px] font-bold uppercase tracking-wider truncate">
              {userCargo || 'CARGO'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}