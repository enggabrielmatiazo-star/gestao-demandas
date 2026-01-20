'use client'
import React from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const router = useRouter()
  
  // 1. ESTADOS DE NAVEGAÇÃO E IDENTIDADE
  const [activeTab, setActiveTab] = useState('demandas')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('') 
  const [userCargo, setUserCargo] = useState('')

  // 2. ESTADOS DO SISTEMA E INTERFACE
  const [demandas, setDemandas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // 3. ESTADOS DO FORMULÁRIO (MODAL)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [numProcesso, setNumProcesso] = useState('') 
  const [cliente, setCliente] = useState('')
  const [novoTitulo, setNovoTitulo] = useState('')   
  const [vencimento, setVencimento] = useState('')
  const [ranking, setRanking] = useState('2')         
  const [linkProjeto, setLinkProjeto] = useState('') 
  const [novaDescricao, setNovaDescricao] = useState('')
  const [atribuidoPara, setAtribuidoPara] = useState('')

  // 4. CARREGAMENTO DE DADOS (Join Técnico com Responsáveis)
  async function carregarDados() {
    setLoading(true)
    const { data: dData } = await supabase
      .from('demandas')
      .select('*, perfis:atribuido_a_id(nome_completo)')
      .order('vencimento', { ascending: true })
    if (dData) setDemandas(dData)
    
    const { data: eData } = await supabase
      .from('perfis')
      .select('id, nome_completo, cargo')
      .not('nome_completo', 'is', null) 
    if (eData) setEquipe(eData)
    setLoading(false)
  }

  // Lógica de Inicialização Corrigida para Identidade
  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      // Busca o perfil real no banco para liberar as travas de cargo
      const { data: perfil } = await supabase
        .from('perfis')
        .select('nome_completo, cargo')
        .eq('id', user.id)
        .maybeSingle()

      if (perfil) {
        setUserName(perfil.nome_completo)
        setUserCargo(perfil.cargo)
      } else {
        setIsFirstLogin(true) // Se não tem perfil, manda para o onboarding
      }
      carregarDados()
    }
    inicializar()
  }, [router])

  // 5. AÇÕES TÉCNICAS (DIRETOR E COORDENADOR LIBERADOS)
  async function handleSalvar() {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') {
      return alert('Acesso Negado: Função restrita à liderança.')
    }
    if (!numProcesso || !novoTitulo) return alert('Campos obrigatórios!')
    
    const payload = { 
      num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, 
      ranking: parseInt(ranking), link_projeto: linkProjeto, descricao: novaDescricao, 
      status: 'Aberta', atribuido_a_id: atribuidoPara || null 
    }

    const { error } = editId 
      ? await supabase.from('demandas').update(payload).eq('id', editId)
      : await supabase.from('demandas').insert([{ ...payload, criado_por_id: userId }])

    if (!error) { 
      setIsModalOpen(false); setEditId(null); limparCampos(); carregarDados(); 
    }
  }

  async function handleConcluir(id: string) {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id)
    carregarDados() 
  }

  function exportarCSV() {
    const cabecalho = "Processo,Cliente,Titulo,Responsavel,Vencimento,Status\n"
    const csv = demandas.map(d => {
      const resp = d.perfis?.nome_completo || 'NÃO ATRIBUÍDO'
      return `${d.num_processo},${d.cliente},${d.titulo},${resp},${d.vencimento},${d.status}`
    }).join("\n")
    const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "ecominas_demandas.csv"); link.click()
  }

  function limparCampos() {
    setNumProcesso(''); setCliente(''); setNovoTitulo(''); setAtribuidoPara(''); 
    setLinkProjeto(''); setNovaDescricao(''); setVencimento(''); setRanking('2');
  }

  // 6. LÓGICA DE FILTROS E CORES
  const hojeStr = new Date().toISOString().split('T')[0]
  const filtradas = demandas.filter(d => (d.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || d.num_processo?.includes(filtroTexto)) && (filtroStatus === 'Todas' ? true : d.status === filtroStatus))

  const getRowColor = (item: any) => {
    if (item.status === 'Concluído') return 'bg-[#238636] text-white' 
    if (item.vencimento && item.vencimento < hojeStr) return 'bg-[#da3633] text-white' 
    return 'hover:bg-[#1c2128]'
  }

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-[#d1d5db] font-sans uppercase overflow-hidden">
      
      {/* MENU LATERAL (SIDEBAR) */}
      <div className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col p-6 shadow-2xl z-20">
        <div className="bg-emerald-600 px-4 py-3 font-black text-white italic text-2xl rounded text-center mb-8 shadow-lg shadow-emerald-900/40">ECOMINAS</div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('demandas')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'demandas' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>📋 DEMANDAS ESCRITÓRIO</button>
          <button onClick={() => setActiveTab('clientes')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'clientes' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>🤝 DEMANDAS OPERAÇÃO</button>
        </nav>
        <div className="mt-auto border-t border-[#30363d] pt-6">
          <p className="text-[10px] text-white font-black truncate uppercase">{userName || 'IDENTIFICANDO...'}</p>
          <p className="text-[8px] text-emerald-500 font-bold">{userCargo || 'CARREGANDO'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 relative">
        {activeTab === 'demandas' && (
          <div className="max-w-7xl mx-auto">
            {/* HEADER COM USUÁRIO E CARGO */}
            <div className="flex justify-between items-center mb-6 bg-[#161b22] p-4 border border-[#30363d] rounded-lg shadow-xl">
              <div className="text-[10px] font-bold text-white uppercase italic">USUÁRIO: {userName} ({userCargo})</div>
              <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg">
                {['Todas', 'Aberta', 'Concluído'].map((s) => (
                  <button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black ${filtroStatus === s ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-white'}`}>{s}</button>
                ))}
              </div>
              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                <button onClick={() => { setEditId(null); limparCampos(); setIsModalOpen(true); }} className="bg-[#00c58e] text-black px-6 py-3 rounded font-black text-[10px] shadow-lg active:scale-95 transition-all">+ ADICIONAR DEMANDA</button>
              )}
            </div>

            {/* TABELA COM COLUNA DE DIAS E EXPANSÃO */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]">
                    <th className="p-4 border-r border-[#30363d]">DEMANDA / CLIENTE</th>
                    <th className="p-4 border-r border-[#30363d]">RESP. TÉCNICO</th>
                    <th className="p-4 border-r border-[#30363d]">VENCIMENTO</th>
                    <th className="p-4 border-r border-[#30363d]">DIAS</th>
                    <th className="p-4 border-r border-[#30363d]">PROCESSO ANM</th>
                    <th className="p-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                  {filtradas.map((item) => {
                    const dataVenc = item.vencimento ? new Date(item.vencimento) : null
                    const dias = dataVenc ? Math.ceil((dataVenc.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0
                    const isExpanded = expandedRowId === item.id
                    const tecnicoNome = item.perfis?.nome_completo || 'NÃO ATRIBUÍDO'

                    return (
                      <React.Fragment key={item.id}>
                        <tr onClick={() => setExpandedRowId(isExpanded ? null : item.id)} className={`border-b border-[#30363d]/50 transition-all cursor-pointer ${getRowColor(item)}`}>
                          <td className="p-4"><div className="flex items-center gap-2"><span>{isExpanded ? '▼' : '▶'}</span><div><p className="uppercase">{item.ranking === 4 ? '!!! ' : item.ranking === 3 ? '! ' : ''}{item.titulo}</p><p className={`text-[9px] italic ${getRowColor(item).includes('bg') ? 'text-white/70' : 'text-slate-500'}`}>{item.cliente}</p></div></div></td>
                          <td className="p-4"><span className="bg-black/20 px-2 py-1 rounded text-[9px] font-black">{tecnicoNome}</span></td>
                          <td className="p-4 font-mono">{dataVenc ? dataVenc.toLocaleDateString('pt-BR') : '--'}</td>
                          <td className="p-4 font-black">{dias}</td>
                          <td className="p-4 font-mono">{item.num_processo}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                                <>
                                  {item.status !== 'Concluído' && <button onClick={() => handleConcluir(item.id)} className="bg-white/20 hover:bg-white/40 px-3 py-1 rounded text-[9px] font-black uppercase">OK</button>}
                                  <button onClick={() => { setEditId(item.id); setNumProcesso(item.num_processo); setNovoTitulo(item.titulo); setCliente(item.cliente); setAtribuidoPara(item.atribuido_a_id || ''); setLinkProjeto(item.link_projeto || ''); setNovaDescricao(item.descricao || ''); setIsModalOpen(true); }} className="p-1 hover:scale-125">✎</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#0d1117] border-b border-[#30363d]">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div><h4 className="text-emerald-500 text-[9px] font-black tracking-widest mb-2 italic">LINK DO PROCESSO</h4>{item.link_projeto ? <a href={item.link_projeto} target="_blank" rel="noreferrer" className="text-white hover:text-emerald-400 text-[11px] underline break-all font-mono">{item.link_projeto}</a> : <span className="text-slate-600 text-[10px] italic">Sem link.</span>}</div>
                                <div><h4 className="text-emerald-500 text-[9px] font-black tracking-widest mb-2 italic">NOTAS TÉCNICAS</h4><p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{item.descricao || 'Sem observações.'}</p></div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}