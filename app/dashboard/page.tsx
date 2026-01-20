'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()
  
  // 1. IDENTIDADE E NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState('demandas')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('') 
  const [userCargo, setUserCargo] = useState('')
  const [loading, setLoading] = useState(true)

  // 2. ESTADOS DO SISTEMA (GERAL)
  const [demandas, setDemandas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([]) 
  const [viagens, setViagens] = useState<any[]>([])
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // 3. ESTADOS DO MÓDULO DE VIAGENS (LOGÍSTICA)
  const [isModalViagemOpen, setIsModalViagemOpen] = useState(false)
  const [responsavelViagemId, setResponsavelViagemId] = useState('')
  const [participantesSelecionados, setParticipantesSelecionados] = useState<string[]>([])
  const [kmInicial, setKmInicial] = useState(0)
  const [kmFinal, setKmFinal] = useState(0)
  const [fuel, setFuel] = useState(0)
  const [food, setFood] = useState(0)
  const [hotel, setHotel] = useState(0)
  const [descricaoViagem, setDescricaoViagem] = useState('')

  // 4. ESTADOS DO MÓDULO DE DEMANDAS
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

  // 5. ONBOARDING (RESTAURADO PARA BUILD)
  const [nomeOnboarding, setNomeOnboarding] = useState('')
  const [cargoOnboarding, setCargoOnboarding] = useState('Engenheiro')

  // CARREGAMENTO DE DADOS INTEGRADO
  async function carregarDados() {
    setLoading(true)
    const { data: dData } = await supabase.from('demandas').select('*, perfis:atribuido_a_id(nome_completo)').order('vencimento', { ascending: true })
    if (dData) setDemandas(dData)
    
    const { data: eData } = await supabase.from('perfis').select('id, nome_completo, cargo').not('nome_completo', 'is', null) 
    if (eData) setEquipe(eData)

    const { data: vData } = await supabase.from('viagens').select('*, perfis:responsavel_id(nome_completo)').order('created_at', { ascending: false })
    if (vData) setViagens(vData)
    setLoading(false)
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data: perfil } = await supabase.from('perfis').select('nome_completo, cargo').eq('id', user.id).maybeSingle()
      if (perfil) { setUserName(perfil.nome_completo); setUserCargo(perfil.cargo); }
      else { setIsFirstLogin(true); }
      carregarDados()
    }
    inicializar()
  }, [router])

  // CÁLCULO DOS CARDS DE INDICADORES
  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]
  const stats = {
    abertas: demandas.filter(d => d.status === 'Aberta').length,
    concluidas: demandas.filter(d => d.status === 'Concluído').length,
    atrasadas: demandas.filter(d => d.status === 'Aberta' && d.vencimento && d.vencimento < hojeStr).length
  }

  // AÇÕES TÉCNICAS (DEMANDAS)
  async function handleSalvar() {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Negado.')
    const payload = { num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, ranking: parseInt(ranking), link_projeto: linkProjeto, descricao: novaDescricao, status: 'Aberta', atribuido_a_id: atribuidoPara || null }
    const { error } = editId ? await supabase.from('demandas').update(payload).eq('id', editId) : await supabase.from('demandas').insert([{ ...payload, criado_por_id: userId }])
    if (!error) { setIsModalOpen(false); setEditId(null); carregarDados(); }
  }

  async function handleExcluir(id: string) {
    if (userCargo !== 'Diretor') return alert('Apenas o Diretor pode excluir registros.')
    if (confirm('Deseja apagar esta demanda permanentemente?')) {
      const { error } = await supabase.from('demandas').delete().eq('id', id)
      if (!error) carregarDados()
    }
  }

  async function handleConcluir(id: string) {
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id)
    carregarDados() 
  }

  // AÇÕES TÉCNICAS (VIAGENS)
  async function handleSalvarViagem() {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Negado.')
    if (!responsavelViagemId) return alert('Selecione o motorista!')
    
    const payload = {
      responsavel_id: responsavelViagemId,
      participantes: participantesSelecionados.join(', '),
      km_inicial: kmInicial, km_final: kmFinal,
      custo_combustivel: fuel, custo_alimentacao: food, custo_hospedagem: hotel,
      descricao: descricaoViagem
    }

    const { error } = await supabase.from('viagens').insert([payload])
    if (!error) { setIsModalViagemOpen(false); carregarDados(); }
  }

  const toggleParticipante = (nome: string) => {
    setParticipantesSelecionados(prev => prev.includes(nome) ? prev.filter(p => p !== nome) : [...prev, nome])
  }

  async function handleCriarPerfil() {
    if (!nomeOnboarding) return alert('Digite seu nome completo.')
    const { error } = await supabase.from('perfis').insert([{ id: userId, nome_completo: nomeOnboarding, cargo: cargoOnboarding, empresa: 'Ecominas Mineração' }])
    if (!error) { setUserName(nomeOnboarding); setUserCargo(cargoOnboarding); setIsFirstLogin(false); carregarDados(); }
  }

  // CORES DE GESTÃO
  const getRowColor = (item: any) => {
    if (item.status === 'Concluído') return 'bg-[#238636]/15 text-[#2fb344]' 
    if (item.vencimento && item.vencimento < hojeStr) return 'bg-[#da3633]/20 text-[#f85149] border-l-4 border-red-600 font-bold' 
    return 'hover:bg-[#1c2128]'
  }

  const filtradas = demandas.filter(d => (d.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || d.num_processo?.includes(filtroTexto)) && (filtroStatus === 'Todas' ? true : d.status === filtroStatus))

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-[#d1d5db] font-sans uppercase overflow-hidden text-left">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-[#161b22] border-r border-[#30363d] flex flex-col p-6 gap-8 shadow-2xl z-20">
        <div className="bg-emerald-600 px-4 py-3 font-black text-white italic text-2xl rounded text-center shadow-lg uppercase">ECOMINAS</div>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActiveTab('demandas')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'demandas' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white'}`}>📋 ESCRITÓRIO</button>
          <button onClick={() => setActiveTab('viagens')} className={`flex items-center gap-3 p-4 rounded font-black text-[11px] transition-all ${activeTab === 'viagens' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/30' : 'text-slate-500 hover:text-white'}`}>🚗 VIAGENS</button>
        </nav>
        <div className="mt-auto border-t border-[#30363d] pt-6 uppercase">
          <p className="text-[10px] text-white font-black truncate">{userName || 'IDENTIFICANDO...'}</p>
          <p className="text-[8px] text-emerald-500 font-bold">{userCargo || 'CARREGANDO'}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 relative">
        
        {/* ABA DEMANDAS */}
        {activeTab === 'demandas' && (
          <div className="max-w-7xl mx-auto space-y-6">
            
            {/* 1. TOPO: FILTROS E ADICIONAR */}
            <div className="flex justify-between items-center bg-[#161b22] p-4 border border-[#30363d] rounded-lg shadow-xl">
              <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg">
                {['Todas', 'Aberta', 'Concluído'].map((s) => (
                  <button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black ${filtroStatus === s ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>{s}</button>
                ))}
              </div>
              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                <button onClick={() => { setEditId(null); setIsModalOpen(true); }} className="bg-[#00c58e] text-black px-6 py-3 rounded font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase">+ Adicionar Demanda</button>
              )}
            </div>

            {/* 2. MEIO: CONTADORES (LAYOUT ABAIXO DO BOTÃO ADICIONAR) */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#161b22] p-6 rounded border border-[#30363d] shadow-xl text-left border-l-4 border-emerald-600">
                <p className="text-[9px] font-black text-emerald-500 mb-1 tracking-widest uppercase">Em Aberto</p>
                <p className="text-4xl font-black">{stats.abertas}</p>
              </div>
              <div className="bg-[#161b22] p-6 rounded border border-[#30363d] shadow-xl text-left border-l-4 border-blue-600">
                <p className="text-[9px] font-black text-blue-500 mb-1 tracking-widest uppercase">Concluídas</p>
                <p className="text-4xl font-black">{stats.concluidas}</p>
              </div>
              <div className="bg-[#161b22] p-6 rounded border border-[#30363d] shadow-xl text-left border-l-4 border-red-600">
                <p className="text-[9px] font-black text-red-600 mb-1 tracking-widest uppercase">Atrasadas</p>
                <p className="text-4xl font-black">{stats.atrasadas}</p>
              </div>
            </div>

            {/* 3. BASE: FILTRO PESQUISA */}
            <div className="flex gap-2 mb-4">
              <input placeholder="FILTRAR POR PROCESSO, TÍTULO OU CLIENTE..." className="flex-1 bg-[#0d1117] border border-[#30363d] p-4 rounded text-[11px] text-white font-bold outline-none focus:border-emerald-500 transition-all shadow-inner uppercase" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
            </div>

            {/* 4. TABELA COM COLUNA PROCESSO E LIXEIRA */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-bold">
                <thead>
                  <tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]">
                    <th className="p-4 border-r border-[#30363d]">DEMANDA / CLIENTE</th>
                    <th className="p-4 border-r border-[#30363d]">RESP. TÉCNICO</th>
                    <th className="p-4 border-r border-[#30363d]">VENCIMENTO</th>
                    <th className="p-4 border-r border-[#30363d]">DIAS</th>
                    <th className="p-4 border-r border-[#30363d] text-emerald-500">PROCESSO ANM</th>
                    <th className="p-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((item) => {
                    const dataVenc = item.vencimento ? new Date(item.vencimento) : null
                    const dias = dataVenc ? Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 3600 * 24)) : 0
                    const isExpanded = expandedRowId === item.id
                    return (
                      <React.Fragment key={item.id}>
                        <tr onClick={() => setExpandedRowId(isExpanded ? null : item.id)} className={`border-b border-[#30363d]/50 transition-all cursor-pointer ${getRowColor(item)}`}>
                          <td className="p-4 uppercase"><div>{item.titulo}<br/><span className="text-[9px] italic opacity-60 uppercase">{item.cliente}</span></div></td>
                          <td className="p-4 uppercase text-[9px]"><span className="bg-black/20 px-2 py-1 rounded font-black">{item.perfis?.nome_completo || 'PENDENTE'}</span></td>
                          <td className="p-4 font-mono">{dataVenc ? dataVenc.toLocaleDateString('pt-BR') : '--'}</td>
                          <td className="p-4 font-black">{dias}</td>
                          <td className="p-4 font-mono text-emerald-500 uppercase tracking-tighter">{item.num_processo || '--'}</td>
                          <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-end gap-3 items-center">
                              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                                <>
                                  {item.status !== 'Concluído' && <button onClick={() => handleConcluir(item.id)} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[9px] font-black shadow-sm uppercase">OK</button>}
                                  <button onClick={() => { setEditId(item.id); setNumProcesso(item.num_processo || ''); setNovoTitulo(item.titulo); setCliente(item.cliente); setAtribuidoPara(item.atribuido_a_id || ''); setLinkProjeto(item.link_projeto || ''); setNovaDescricao(item.descricao || ''); setIsModalOpen(true); }} className="p-1 hover:scale-125 transition-all text-slate-400">✎</button>
                                  {userCargo === 'Diretor' && <button onClick={() => handleExcluir(item.id)} className="p-1 hover:scale-125 transition-all text-red-500">🗑️</button>}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-[#0d1117] border-b border-[#30363d]">
                            <td colSpan={6} className="p-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left uppercase">
                                <div><h4 className="text-emerald-500 text-[9px] font-black mb-2 italic tracking-widest uppercase">Link SEI / Jazida</h4>{item.link_projeto ? <a href={item.link_projeto} target="_blank" rel="noreferrer" className="text-white hover:text-emerald-400 underline break-all font-mono italic">{item.link_projeto}</a> : <span className="text-slate-600 text-[10px] italic">Sem link.</span>}</div>
                                <div><h4 className="text-emerald-500 text-[9px] font-black mb-2 italic tracking-widest uppercase">Notas Técnicas</h4><p className="text-[11px] text-slate-300 leading-relaxed whitespace-pre-wrap">{item.descricao || 'Sem observações cadastradas.'}</p></div>
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

        {/* ABA 2: VIAGENS (TABELA COMPLETA) */}
        {activeTab === 'viagens' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase text-left">
              <div><h2 className="text-2xl font-black italic text-emerald-500 tracking-tighter uppercase">Logística de Campo</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Controle de frotas e despesas operacionais</p></div>
              <button onClick={() => setIsModalViagemOpen(true)} className="bg-emerald-600 text-black px-8 py-4 rounded font-black text-[10px] active:scale-95 transition-all uppercase">+ Lançar Viagem</button>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-bold">
                <thead>
                  <tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]">
                    <th className="p-4 border-r border-[#30363d]">RESPONSÁVEL / DATA</th>
                    <th className="p-4 border-r border-[#30363d]">KM INICIAL / FINAL</th>
                    <th className="p-4 border-r border-[#30363d] bg-emerald-900/10 text-emerald-500 text-center">KM TOTAL</th>
                    <th className="p-4 border-r border-[#30363d]">CUSTO TOTAL (R$)</th>
                    <th className="p-4">EQUIPE / MOTIVO</th>
                  </tr>
                </thead>
                <tbody>
                  {viagens.map((v) => (
                    <tr key={v.id} className="border-b border-[#30363d]/50 hover:bg-[#1c2128] uppercase">
                      <td className="p-4 border-r border-[#30363d]/30 uppercase">MOTORISTA: {v.perfis?.nome_completo || 'CARGA'}<br/><span className="text-[9px] text-slate-500 italic uppercase">{new Date(v.created_at).toLocaleDateString('pt-BR')}</span></td>
                      <td className="p-4 font-mono text-slate-400 border-r border-[#30363d]/30 text-center">{v.km_inicial} / {v.km_final}</td>
                      <td className="p-4 font-black text-emerald-500 bg-emerald-900/5 border-r border-[#30363d]/30 text-center">{Number(v.km_final) - Number(v.km_inicial)} KM</td>
                      <td className="p-4 font-black border-r border-[#30363d]/30 text-center text-blue-400">R$ {(Number(v.custo_combustivel) + Number(v.custo_alimentacao) + Number(v.custo_hospedagem)).toFixed(2)}</td>
                      <td className="p-4 text-[9px] uppercase"><p className="text-white font-bold tracking-tight">{v.participantes || 'SÓ MOTORISTA'}</p><p className="text-slate-500 italic mt-1 leading-tight">{v.descricao || '--'}</p></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL VIAGEM */}
        {isModalViagemOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-2xl shadow-2xl overflow-y-auto uppercase">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 text-lg uppercase">Registro de Viagem</h2>
              <div className="space-y-6 text-left">
                <div><label className="text-[8px] font-black text-slate-500 block mb-1">Motorista Responsável *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase" value={responsavelViagemId} onChange={e => setResponsavelViagemId(e.target.value)}><option value="">SELECIONE UM PROFISSIONAL</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-2 uppercase tracking-widest">Participantes (Equipe)</label><div className="flex flex-wrap gap-2 p-3 bg-[#0d1117] border border-[#30363d] rounded">{equipe.map(tec => (<button key={tec.id} onClick={() => toggleParticipante(tec.nome_completo)} className={`px-3 py-2 rounded text-[9px] font-black transition-all ${participantesSelecionados.includes(tec.nome_completo) ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-800 text-slate-500 hover:text-white'}`}>{participantesSelecionados.includes(tec.nome_completo) ? '✓ ' : '+ '} {tec.nome_completo}</button>))}</div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase uppercase">Km Inicial</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-mono uppercase" value={kmInicial} onChange={e => setKmInicial(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase uppercase">Km Final</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-mono uppercase" value={kmFinal} onChange={e => setKmFinal(Number(e.target.value))} /></div>
                </div>
                <div className="bg-emerald-900/10 p-3 rounded border border-emerald-500/20 text-center"><p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Rodagem Total Detectada: {kmFinal - kmInicial} KM</p></div>
                <div className="grid grid-cols-3 gap-4 text-left uppercase">
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1">Combustível</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={fuel} onChange={e => setFuel(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1">Alimentação</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={food} onChange={e => setFood(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1">Hospedagem</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={hotel} onChange={e => setHotel(Number(e.target.value))} /></div>
                </div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Motivo / Jazida Alvo</label><textarea className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-20 resize-none outline-none focus:border-emerald-500 uppercase" value={descricaoViagem} onChange={e => setDescricaoViagem(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvarViagem} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all active:scale-95">Salvar Viagem</button><button onClick={() => setIsModalViagemOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400">Cancelar</button></div>
            </div>
          </div>
        )}

        {/* MODAL DEMANDAS */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto uppercase text-left">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 text-lg uppercase tracking-widest text-left">Gestão Técnica ANM</h2>
              <div className="space-y-4">
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase tracking-widest">Responsável Técnico *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase" value={atribuidoPara} onChange={e => setAtribuidoPara(e.target.value)}><option value="">SELECIONE UM PROFISSIONAL</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                 <div className="grid grid-cols-2 gap-3 uppercase">
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Processo ANM</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={numProcesso} onChange={e => setNumProcesso(e.target.value)} /></div>
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Cliente</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={cliente} onChange={e => setCliente(e.target.value)} /></div>
                 </div>
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase uppercase">Título da Demanda</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold uppercase" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3 uppercase">
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase">Vencimento</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={vencimento} onChange={e => setVencimento(e.target.value)} /></div>
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase tracking-tighter">Criticidade</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold uppercase" value={ranking} onChange={e => setRanking(e.target.value)}><option value="2">NORMAL</option><option value="3">URGENTE (!)</option><option value="4">CRÍTICA (!!!)</option></select></div>
                 </div>
                 <div><label className="text-[8px] font-black text-emerald-500 block mb-1 uppercase italic tracking-widest uppercase">Link SEI / ANM</label><input placeholder="SEI / ANM LINK" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 uppercase" value={linkProjeto} onChange={e => setLinkProjeto(e.target.value)} /></div>
                 <div><label className="text-[8px] font-black text-emerald-500 block mb-1 uppercase italic tracking-widest uppercase">Notas Técnicas</label><textarea placeholder="OBSERVAÇÕES OPERACIONAIS" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-24 uppercase outline-none focus:border-emerald-500 resize-none uppercase" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvar} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all uppercase">Salvar Operação</button><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400 uppercase">Fechar</button></div>
            </div>
          </div>
        )}

        {/* ONBOARDING */}
        {isFirstLogin && (
          <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] backdrop-blur-md uppercase">
            <div className="bg-[#161b22] p-10 rounded border border-emerald-500/30 w-full max-w-md shadow-2xl text-center uppercase">
              <h2 className="text-2xl font-black mb-2 text-emerald-500 uppercase italic">Acesso Ecominas</h2>
              <div className="space-y-4 text-left uppercase">
                <input className="w-full p-4 rounded bg-[#0d1117] border border-[#30363d] text-white font-bold uppercase" value={nomeOnboarding} onChange={(e) => setNomeOnboarding(e.target.value)} placeholder="NOME DO PROFISSIONAL" />
                <button onClick={handleCriarPerfil} className="w-full mt-10 bg-emerald-600 p-5 rounded font-black uppercase text-xs shadow-lg transition-all active:scale-95 uppercase">Sincronizar Acesso</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}