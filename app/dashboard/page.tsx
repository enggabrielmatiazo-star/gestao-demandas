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
  const [userName, setUserName] = useState('Gabriel Matiazo') 
  const [userCargo, setUserCargo] = useState('')

  // 2. ESTADOS DO SISTEMA
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
  const [nomeOnboarding, setNomeOnboarding] = useState('')

  // 4. FUNÇÕES DE CARREGAMENTO
  async function carregarDados() {
    setLoading(true)
    const { data: dData } = await supabase.from('demandas').select('*, perfis:atribuido_a_id(nome_completo)').order('vencimento', { ascending: true })
    if (dData) setDemandas(dData)
    const { data: eData } = await supabase.from('perfis').select('id, nome_completo, cargo').not('nome_completo', 'is', null) 
    if (eData) setEquipe(eData)
    setLoading(false)
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: perfil } = await supabase.from('perfis').select('nome_completo, cargo').eq('id', user.id).single()
      if (perfil) { setUserName(perfil.nome_completo); setUserCargo(perfil.cargo); } 
      else { setIsFirstLogin(true); }
      carregarDados()
    }
    inicializar()
  }, [router])

  // 5. AÇÕES TÉCNICAS (RESTAURADO EXPORTAR CSV)
  async function handleSalvar() {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Negado.')
    if (!numProcesso || !novoTitulo) return alert('Campos obrigatórios!')
    const payload = { 
      num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, 
      ranking: parseInt(ranking), link_projeto: linkProjeto, descricao: novaDescricao, 
      status: 'Aberta', atribuido_a_id: atribuidoPara || null 
    }
    const { error } = editId ? await supabase.from('demandas').update(payload).eq('id', editId) : await supabase.from('demandas').insert([{ ...payload, criado_por_id: userId }])
    if (!error) { setIsModalOpen(false); setEditId(null); limparCampos(); carregarDados(); }
  }

  async function handleConcluir(id: string) {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id)
    carregarDados() 
  }

  function exportarCSV() {
    const cabecalho = "Processo,Cliente,Titulo,Responsavel,Vencimento,Status\n"
    const csv = demandas.map(d => `${d.num_processo},${d.cliente},${d.titulo},${d.perfis?.nome_completo || 'N/A'},${d.vencimento},${d.status}`).join("\n")
    const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "ecominas_demandas.csv"); link.click()
  }

  function limparCampos() {
    setNumProcesso(''); setCliente(''); setNovoTitulo(''); setAtribuidoPara(''); 
    setLinkProjeto(''); setNovaDescricao(''); setVencimento(''); setRanking('2');
  }

  // 6. LÓGICA DE INTERFACE
  const hojeStr = new Date().toISOString().split('T')[0]
  const filtradas = demandas.filter(d => {
    const busca = d.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || d.num_processo?.includes(filtroTexto)
    const status = filtroStatus === 'Todas' ? true : d.status === filtroStatus
    return busca && status
  })

  const getRowColor = (item: any) => {
    if (item.status === 'Concluído') return 'bg-[#238636] text-white' 
    if (item.vencimento && item.vencimento < hojeStr) return 'bg-[#da3633] text-white' 
    return 'hover:bg-[#1c2128]'
  }

  const c_abertas = demandas.filter(d => d.status !== 'Concluído').length
  const c_concluidas = demandas.filter(d => d.status === 'Concluído').length
  const c_atrasadas = demandas.filter(d => d.status !== 'Concluído' && d.vencimento && d.vencimento < hojeStr).length

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-[#d1d5db] font-sans uppercase overflow-hidden">
      
      {/* MENU LATERAL FIXO */}
      <div className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col p-6 gap-8 shadow-2xl z-20">
        <div className="bg-emerald-600 px-4 py-3 font-black text-white italic text-2xl rounded text-center shadow-lg">ECOMINAS</div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('demandas')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'demandas' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>📋 CENTRAL DE DEMANDAS</button>
          <button onClick={() => setActiveTab('clientes')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'clientes' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}>🤝 CLIENTES FIXOS</button>
        </nav>
        <div className="mt-auto border-t border-[#30363d] pt-6">
          <p className="text-[10px] text-white font-black truncate">{userName}</p>
          <p className="text-[8px] text-emerald-500 font-bold">{userCargo}</p>
        </div>
      </div>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {activeTab === 'demandas' && (
          <div className="max-w-7xl mx-auto">
            {/* HEADER COM FILTROS */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[#161b22] p-4 border border-[#30363d] rounded-lg gap-4 shadow-xl">
              <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
                {['Todas', 'Aberta', 'Concluído'].map((s) => (
                  <button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black transition-all ${filtroStatus === s ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{s}</button>
                ))}
              </div>
              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                <button onClick={() => { setEditId(null); limparCampos(); setIsModalOpen(true); }} className="bg-[#00c58e] hover:bg-[#00a87a] text-black px-6 py-3 rounded font-black text-[10px] shadow-lg">+ ADICIONAR DEMANDA</button>
              )}
            </div>

            {/* CONTADORES ORIGINAIS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-[#161b22] p-6 border border-[#30363d] rounded-lg">
                <h3 className="text-slate-500 text-[9px] font-black uppercase">Em Aberto</h3>
                <p className="text-4xl font-black text-emerald-500">{c_abertas}</p>
              </div>
              <div className="bg-[#161b22] p-6 border border-[#30363d] rounded-lg">
                <h3 className="text-slate-500 text-[9px] font-black uppercase">Concluídas</h3>
                <p className="text-4xl font-black text-blue-500">{c_concluidas}</p>
              </div>
              <div className="bg-[#161b22] p-6 border border-red-900/30 rounded-lg animate-pulse">
                <h3 className="text-red-500/50 text-[9px] font-black uppercase">Atrasadas</h3>
                <p className="text-4xl font-black text-red-600">{c_atrasadas}</p>
              </div>
            </div>

            {/* BARRA DE BUSCA E EXPORTAÇÃO (CORRIGIDA) */}
            <div className="flex gap-2 mb-4">
              <input placeholder="FILTRAR POR PROCESSO, TÍTULO OU CLIENTE..." className="flex-1 bg-[#0d1117] border border-[#30363d] p-4 rounded text-[11px] text-white font-bold outline-none focus:border-emerald-500 uppercase transition-all" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
              <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-6 rounded text-[10px] font-black text-white border border-[#30363d]">EXPORTAR CSV</button>
            </div>

            {/* TABELA COM COLUNA DE DIAS E EXPANSÃO */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0d1117] text-[10px] uppercase font-black text-slate-500 tracking-tighter border-b border-[#30363d]">
                    <th className="p-4 border-r border-[#30363d]">Demanda / Cliente</th>
                    <th className="p-4 border-r border-[#30363d]">Resp. Técnico</th>
                    <th className="p-4 border-r border-[#30363d]">Vencimento</th>
                    <th className="p-4 border-r border-[#30363d]">Dias</th>
                    <th className="p-4 border-r border-[#30363d]">Processo ANM</th>
                    <th className="p-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold">
                  {filtradas.map((item) => {
                    const dataVenc = item.vencimento ? new Date(item.vencimento) : null
                    const dias = dataVenc ? Math.ceil((dataVenc.getTime() - new Date().getTime()) / (1000 * 3600 * 24)) : 0
                    const isExpanded = expandedRowId === item.id
                    return (
                      <React.Fragment key={item.id}>
                        <tr onClick={() => setExpandedRowId(isExpanded ? null : item.id)} className={`border-b border-[#30363d]/50 transition-all cursor-pointer ${getRowColor(item)}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span>{isExpanded ? '▼' : '▶'}</span>
                              <div><p className="uppercase">{item.ranking === 4 ? '!!! ' : item.ranking === 3 ? '! ' : ''}{item.titulo}</p><p className={`text-[9px] italic ${getRowColor(item).includes('bg') ? 'text-white/70' : 'text-slate-500'}`}>{item.cliente}</p></div>
                            </div>
                          </td>
                          <td className="p-4"><span className="bg-black/20 px-2 py-1 rounded text-[9px] font-black">{item.perfis?.nome_completo || 'NÃO ATRIBUÍDO'}</span></td>
                          <td className="p-4 font-mono">{dataVenc ? dataVenc.toLocaleDateString('pt-BR') : '--'}</td>
                          <td className="p-4 font-black">{dias}</td>
                          <td className="p-4 font-mono">{item.num_processo}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                                <>
                                  {item.status !== 'Concluído' && <button onClick={() => handleConcluir(item.id)} className="bg-white/20 hover:bg-white/40 px-3 py-1 rounded text-[9px] font-black uppercase">OK</button>}
                                  <button onClick={() => { setEditId(item.id); setNumProcesso(item.num_processo); setNovoTitulo(item.titulo); setCliente(item.cliente); setAtribuidoPara(item.atribuido_a_id || ''); setLinkProjeto(item.link_projeto || ''); setNovaDescricao(item.descricao || ''); setIsModalOpen(true); }} className="p-1 hover:scale-125 transition-all">✎</button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#0d1117] border-b border-[#30363d]">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div><h4 className="text-emerald-500 text-[9px] font-black tracking-widest mb-2 italic">LINK DO PROCESSO</h4>{item.link_projeto ? <a href={item.link_projeto} target="_blank" rel="noreferrer" className="text-white hover:text-emerald-400 text-[11px] underline break-all font-mono italic">{item.link_projeto}</a> : <span className="text-slate-600 text-[10px] italic">Sem link.</span>}</div>
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

        {/* ABA CLIENTES (Vazio para expansão futura) */}
        {activeTab === 'clientes' && (
          <div className="max-w-7xl mx-auto">
            <h2 className="text-2xl font-black italic text-emerald-500 mb-8 border-b border-[#30363d] pb-4 uppercase">Portfólio de Clientes Fixos</h2>
            <p className="text-slate-500">Módulo de gestão de contratos permanentes.</p>
          </div>
        )}

        {/* MODAL GESTÃO (Integrado e Completo) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 uppercase tracking-widest text-lg text-left italic">Gestão Técnica de Jazida</h2>
              <div className="space-y-4 text-left">
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase tracking-widest italic">Responsável Técnico *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase font-bold outline-none focus:border-emerald-500" value={atribuidoPara} onChange={e => setAtribuidoPara(e.target.value)}><option value="">Selecione um Profissional</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                 <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Processo ANM</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={numProcesso} onChange={e => setNumProcesso(e.target.value)} /></div>
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Cliente</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={cliente} onChange={e => setCliente(e.target.value)} /></div>
                 </div>
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Título da Demanda</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold uppercase" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3">
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Vencimento</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={vencimento} onChange={e => setVencimento(e.target.value)} /></div>
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Criticidade</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={ranking} onChange={e => setRanking(e.target.value)}><option value="2">NORMAL</option><option value="3">URGENTE (!)</option><option value="4">CRÍTICA (!!!)</option></select></div>
                 </div>
                 <div><label className="text-[8px] font-black text-emerald-500 block mb-1 uppercase tracking-widest italic">Link do Processo</label><input placeholder="SEI / ANM LINK" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={linkProjeto} onChange={e => setLinkProjeto(e.target.value)} /></div>
                 <div><label className="text-[8px] font-black text-emerald-500 block mb-1 uppercase tracking-widest italic">Notas Técnicas</label><textarea placeholder="OBSERVAÇÕES OPERACIONAIS" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-24 uppercase outline-none focus:border-emerald-500 resize-none" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvar} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all">Salvar Operação</button><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400">Fechar</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}