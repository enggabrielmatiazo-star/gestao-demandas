'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sidebar } from './components/sidebar'
import { StatsCards } from './components/StatsCards'

export default function Dashboard() {
  const router = useRouter()
  
  // ESTADOS DE NAVEGAÇÃO
  const [activeTab, setActiveTab] = useState('demandas')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('') 
  const [userCargo, setUserCargo] = useState('')
  const [loading, setLoading] = useState(true)

  // ESTADOS DE DADOS
  const [demandas, setDemandas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([]) 
  const [viagens, setViagens] = useState<any[]>([])
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // MODAIS
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalViagemOpen, setIsModalViagemOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // CAMPOS VIAGEM
  const [responsavelViagemId, setResponsavelViagemId] = useState('')
  const [participantesSelecionados, setParticipantesSelecionados] = useState<string[]>([])
  const [kmInicial, setKmInicial] = useState(0); const [kmFinal, setKmFinal] = useState(0)
  const [fuel, setFuel] = useState(0); const [food, setFood] = useState(0); const [hotel, setHotel] = useState(0)
  const [toll, setToll] = useState(0); const [others, setOthers] = useState(0)
  const [descricaoViagem, setDescricaoViagem] = useState('')

  // CAMPOS DEMANDA
  const [numProcesso, setNumProcesso] = useState('')
  const [cliente, setCliente] = useState('')
  const [novoTitulo, setNovoTitulo] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [ranking, setRanking] = useState('2')
  const [linkProjeto, setLinkProjeto] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [atribuidoPara, setAtribuidoPara] = useState('')
  const [nomeOnboarding, setNomeOnboarding] = useState('')
  const [cargoOnboarding, setCargoOnboarding] = useState('Engenheiro')

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

  const hoje = new Date(); const hojeStr = hoje.toISOString().split('T')[0]
  const stats = {
    abertas: demandas.filter(d => d.status === 'Aberta').length,
    concluidas: demandas.filter(d => d.status === 'Concluído').length,
    atrasadas: demandas.filter(d => d.status === 'Aberta' && d.vencimento && d.vencimento < hojeStr).length
  }

  // --- AÇÕES DE GESTÃO (EXCLUSÃO E CADASTRO) ---

  async function handleCriarPerfil() {
    if (!nomeOnboarding) return alert('Digite seu nome.')
    const { error } = await supabase.from('perfis').insert([{ id: userId, nome_completo: nomeOnboarding, cargo: cargoOnboarding, empresa: 'Ecominas Mineração' }])
    if (!error) { setUserName(nomeOnboarding); setUserCargo(cargoOnboarding); setIsFirstLogin(false); carregarDados(); }
  }

  async function handleSalvar() {
    const payload = { num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, ranking: parseInt(ranking), link_projeto: linkProjeto, descricao: novaDescricao, status: 'Aberta', atribuido_a_id: atribuidoPara || null }
    const { error } = editId ? await supabase.from('demandas').update(payload).eq('id', editId) : await supabase.from('demandas').insert([{ ...payload, criado_por_id: userId }])
    if (!error) { setIsModalOpen(false); setEditId(null); carregarDados(); }
  }

  // EXCLUSÃO DE DEMANDAS
  async function handleExcluir(id: string) {
    if (userCargo !== 'Diretor') return alert('Acesso restrito à diretoria.')
    if (confirm('ATENÇÃO: Deseja apagar esta demanda permanentemente?')) {
      await supabase.from('demandas').delete().eq('id', id); carregarDados()
    }
  }

  // EXCLUSÃO DE VIAGENS (NOVO)
  async function handleExcluirViagem(id: string) {
    if (userCargo !== 'Diretor') return alert('Acesso restrito à diretoria.')
    if (confirm('ATENÇÃO: Deseja apagar este registro de viagem e custos?')) {
      await supabase.from('viagens').delete().eq('id', id); carregarDados()
    }
  }

  async function handleConcluir(id: string) {
    const cargosAutorizados = ['Diretor', 'Coordenador', 'Engenheiro', 'Geólogo']
    if (!cargosAutorizados.includes(userCargo)) return alert('Acesso Negado.')
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id); carregarDados() 
  }

  async function handleSalvarViagem() {
    const payload = { responsavel_id: responsavelViagemId, participantes: participantesSelecionados.join(', '), km_inicial: kmInicial, km_final: kmFinal, custo_combustivel: fuel, custo_alimentacao: food, custo_hospedagem: hotel, custo_pedagio: toll, custo_outros: others, descricao: descricaoViagem }
    await supabase.from('viagens').insert([payload]); setIsModalViagemOpen(false); carregarDados()
  }

  const toggleParticipante = (nome: string) => {
    setParticipantesSelecionados(prev => prev.includes(nome) ? prev.filter(p => p !== nome) : [...prev, nome])
  }

  function limparCamposViagem() {
    setResponsavelViagemId(''); setParticipantesSelecionados([]);
    setKmInicial(0); setKmFinal(0); setFuel(0); setFood(0); setHotel(0); setToll(0); setOthers(0); setDescricaoViagem('');
  }

  function limparCampos() {
    setNumProcesso(''); setCliente(''); setNovoTitulo(''); setAtribuidoPara(''); setLinkProjeto(''); setNovaDescricao(''); setVencimento(''); setRanking('2');
  }

  function exportarCSV() {
    const cabecalho = "Processo,Cliente,Titulo,Responsavel,Vencimento,Status\n"
    const csv = demandas.map(d => `${d.num_processo},${d.cliente},${d.titulo},${d.perfis?.nome_completo || 'N/A'},${d.vencimento},${d.status}`).join("\n")
    const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "ecominas.csv"); link.click()
  }

  const getRowColor = (item: any) => {
    if (item.status === 'Concluído') return 'bg-[#238636]/15 text-[#2fb344]' 
    if (item.vencimento && item.vencimento < hojeStr) return 'bg-[#da3633]/20 text-[#f85149] border-l-4 border-red-600 font-bold' 
    return 'hover:bg-[#1c2128]'
  }

  const filtradas = demandas.filter(d => (d.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || d.num_processo?.includes(filtroTexto)) && (filtroStatus === 'Todas' ? true : d.status === filtroStatus))

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-[#d1d5db] font-sans uppercase overflow-hidden text-left">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userName={userName} userCargo={userCargo} />

      <div className="flex-1 overflow-y-auto p-8 relative">
        {activeTab === 'demandas' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase">
              <div><h2 className="text-2xl font-black italic text-emerald-500">Escritório Técnico</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Monitoramento ANM</p></div>
              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
                <button onClick={() => { setEditId(null); limparCampos(); setIsModalOpen(true); }} className="bg-[#00c58e] text-black px-8 py-4 rounded font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase">+ Adicionar Demanda</button>
              )}
            </div>

            <StatsCards stats={stats} />

            <div className="flex gap-2 items-center bg-[#161b22] p-4 border border-[#30363d] rounded-lg">
              <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg">
                {['Todas', 'Aberta', 'Concluído'].map((s) => (
                  <button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black ${filtroStatus === s ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>{s}</button>
                ))}
              </div>
              <input placeholder="FILTRAR POR PROCESSO OU CLIENTE..." className="flex-1 bg-[#0d1117] border border-[#30363d] p-4 rounded text-[11px] text-white font-bold outline-none focus:border-emerald-500 transition-all uppercase shadow-inner" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
              <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-6 py-4 rounded text-[10px] font-black text-white border border-[#30363d] shadow-sm uppercase">CSV</button>
            </div>

            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-bold">
                <thead>
                  <tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]">
                    <th className="p-4 border-r border-[#30363d]">DEMANDA / CLIENTE</th>
                    <th className="p-4 border-r border-[#30363d]">RESP. TÉCNICO</th>
                    <th className="p-4 border-r border-[#30363d]">VENCIMENTO</th>
                    <th className="p-4 border-r border-[#30363d]">DIAS</th>
                    <th className="p-4 border-r border-[#30363d] text-emerald-500 uppercase italic">Processo ANM</th>
                    <th className="p-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className={`border-b border-[#30363d]/50 cursor-pointer transition-all ${getRowColor(item)}`}>
                        <td className="p-4 uppercase"><div>{expandedId === item.id ? '▼ ' : '▶ '}{item.titulo}<br/><span className="text-[9px] italic opacity-60 uppercase">{item.cliente}</span></div></td>
                        <td className="p-4 uppercase text-[9px]">{item.perfis?.nome_completo || 'PENDENTE'}</td>
                        <td className="p-4 font-mono">{item.vencimento ? new Date(item.vencimento).toLocaleDateString('pt-BR') : '--'}</td>
                        <td className="p-4 font-black">{item.vencimento ? Math.ceil((new Date(item.vencimento).getTime() - hoje.getTime()) / (1000 * 3600 * 24)) : 0}</td>
                        <td className="p-4 font-mono text-emerald-500 uppercase">{item.num_processo || '--'}</td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-3 items-center font-black">
                            {item.status !== 'Concluído' && <button onClick={() => handleConcluir(item.id)} className="bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-[9px]">OK</button>}
                            {(userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => { setEditId(item.id); setNumProcesso(item.num_processo || ''); setNovoTitulo(item.titulo); setCliente(item.cliente); setAtribuidoPara(item.atribuido_a_id || ''); setLinkProjeto(item.link_projeto || ''); setNovaDescricao(item.descricao || ''); setVencimento(item.vencimento || ''); setRanking(item.ranking.toString()); setIsModalOpen(true); }} className="p-1 text-slate-400 italic hover:scale-125">✎</button>}
                            {userCargo === 'Diretor' && <button onClick={() => handleExcluir(item.id)} className="text-red-500 hover:scale-125 transition-all">🗑️</button>}
                          </div>
                        </td>
                      </tr>
                      {expandedId === item.id && (
                        <tr className="bg-[#0d1117] border-b border-[#30363d] animate-in slide-in-from-top-1">
                          <td colSpan={6} className="p-6">
                            <div className="grid grid-cols-2 gap-8 uppercase">
                              <div><h4 className="text-emerald-500 text-[9px] font-black mb-2 italic">Link Digital SEI / ANM</h4>{item.link_projeto ? <a href={item.link_projeto} target="_blank" className="text-white underline font-mono italic">{item.link_projeto}</a> : <span className="text-slate-600">Sem link.</span>}</div>
                              <div><h4 className="text-emerald-500 text-[9px] font-black mb-2 italic">Notas Técnicas</h4><p className="text-slate-300 leading-relaxed font-bold">{item.descricao || 'Sem observações.'}</p></div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'viagens' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase text-left">
              <div><h2 className="text-2xl font-black italic text-emerald-500">Logística de Campo</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Controle de frotas e despesas</p></div>
              <button onClick={() => setIsModalViagemOpen(true)} className="bg-emerald-600 text-black px-8 py-4 rounded font-black text-[10px] active:scale-95 transition-all uppercase">+ Lançar Viagem</button>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-bold uppercase">
                <thead>
                  <tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]">
                    <th className="p-4 border-r border-[#30363d]">MOTORISTA / DATA</th>
                    <th className="p-4 border-r border-[#30363d]">KM TOTAL</th>
                    <th className="p-4 border-r border-[#30363d]">CUSTO TOTAL (R$)</th>
                    <th className="p-4">EQUIPE / ROTA</th>
                    <th className="p-4 text-right">AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {viagens.map((v) => (
                    <React.Fragment key={v.id}>
                      <tr onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="border-b border-[#30363d]/50 hover:bg-[#1c2128] cursor-pointer transition-all">
                        <td className="p-4 border-r border-[#30363d]/30"><div>{expandedId === v.id ? '▼ ' : '▶ '}{v.perfis?.nome_completo || 'MOTORISTA'}<br/><span className="text-[9px] text-slate-500 italic">{new Date(v.created_at).toLocaleDateString('pt-BR')}</span></div></td>
                        <td className="p-4 font-black text-emerald-500 bg-emerald-900/5 text-center border-r border-[#30363d]/30">{v.km_final - v.km_inicial} KM</td>
                        <td className="p-4 font-black text-blue-400 text-center border-r border-[#30363d]/30">R$ {(Number(v.custo_combustivel) + Number(v.custo_alimentacao) + Number(v.custo_hospedagem) + Number(v.custo_pedagio || 0) + Number(v.custo_outros || 0)).toFixed(2)}</td>
                        <td className="p-4 text-[9px] text-slate-400 italic">{v.participantes || 'SOLO'}</td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {userCargo === 'Diretor' && <button onClick={() => handleExcluirViagem(v.id)} className="text-red-500 hover:scale-125 transition-all">🗑️</button>}
                        </td>
                      </tr>
                      {expandedId === v.id && (
                        <tr className="bg-[#0d1117] border-b border-[#30363d] animate-in slide-in-from-top-1">
                          <td colSpan={5} className="p-6">
                            <div className="grid grid-cols-5 gap-4 mb-4 text-center uppercase shadow-inner">
                              <div className="bg-[#161b22] p-3 rounded border border-[#30363d]"><p className="text-[8px] text-slate-500">COMBUSTÍVEL</p><p className="text-white font-mono">R$ {v.custo_combustivel}</p></div>
                              <div className="bg-[#161b22] p-3 rounded border border-[#30363d]"><p className="text-[8px] text-slate-500">ALIMENTAÇÃO</p><p className="text-white font-mono">R$ {v.custo_alimentacao}</p></div>
                              <div className="bg-[#161b22] p-3 rounded border border-[#30363d]"><p className="text-[8px] text-slate-500">HOSPEDAGEM</p><p className="text-white font-mono">R$ {v.custo_hospedagem}</p></div>
                              <div className="bg-[#161b22] p-3 rounded border border-emerald-500/20"><p className="text-[8px] text-emerald-500">PEDÁGIO</p><p className="text-white font-mono">R$ {v.custo_pedagio || 0}</p></div>
                              <div className="bg-[#161b22] p-3 rounded border border-blue-500/20"><p className="text-[8px] text-blue-500">OUTROS</p><p className="text-white font-mono">R$ {v.custo_outros || 0}</p></div>
                            </div>
                            <div className="bg-[#161b22] p-4 rounded border border-[#30363d] uppercase italic"><h4 className="text-emerald-500 text-[9px] font-black mb-1">Motivo / Rota</h4><p className="text-slate-300 font-bold">{v.descricao || '--'}</p></div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODAL VIAGEM */}
        {isModalViagemOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm uppercase">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-2xl shadow-2xl overflow-y-auto">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 text-lg uppercase tracking-widest text-left italic">Registro Técnico de Viagem</h2>
              <div className="space-y-6 text-left">
                <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase tracking-widest italic">Motorista *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase" value={responsavelViagemId} onChange={e => setResponsavelViagemId(e.target.value)}><option value="">SELECIONE UM PROFISSIONAL</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-2 uppercase tracking-widest italic">Equipe</label><div className="flex flex-wrap gap-2 p-3 bg-[#0d1117] border border-[#30363d] rounded">{equipe.map(tec => (<button key={tec.id} onClick={() => toggleParticipante(tec.nome_completo)} className={`px-3 py-2 rounded text-[9px] font-black transition-all ${participantesSelecionados.includes(tec.nome_completo) ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40' : 'bg-slate-800 text-slate-500'}`}>{participantesSelecionados.includes(tec.nome_completo) ? '✓ ' : '+ '} {tec.nome_completo}</button>))}</div></div>
                <div className="grid grid-cols-2 gap-4 uppercase italic font-black">
                  <div><label className="text-[8px] text-slate-500 block mb-1">Km Inicial</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono shadow-inner" value={kmInicial} onChange={e => setKmInicial(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] text-slate-500 block mb-1">Km Final</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono shadow-inner" value={kmFinal} onChange={e => setKmFinal(Number(e.target.value))} /></div>
                </div>
                <div className="bg-emerald-900/10 p-4 rounded border border-emerald-500/20 text-center font-black italic shadow-inner"><p className="text-[10px] text-emerald-500 uppercase tracking-widest italic font-mono">Rodagem: {kmFinal - kmInicial} KM</p></div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-left uppercase font-black italic">
                  <div><label className="text-[8px] text-slate-500 block mb-1">Combustível</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white focus:border-emerald-500 font-mono outline-none shadow-inner" value={fuel} onChange={e => setFuel(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] text-slate-500 block mb-1">Alimentação</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white focus:border-emerald-500 font-mono outline-none shadow-inner" value={food} onChange={e => setFood(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] text-slate-500 block mb-1">Hospedagem</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white focus:border-emerald-500 font-mono outline-none shadow-inner" value={hotel} onChange={e => setHotel(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] text-emerald-500 block mb-1 tracking-tighter">Pedágio</label><input type="number" className="w-full bg-[#0d1117] border border-emerald-500/30 p-3 text-xs text-white outline-none focus:border-emerald-500 font-mono shadow-inner" value={toll} onChange={e => setToll(Number(e.target.value))} /></div>
                  <div><label className="text-[8px] text-blue-500 block mb-1 tracking-tighter">Outros</label><input type="number" className="w-full bg-[#0d1117] border border-blue-500/30 p-3 text-xs text-white outline-none focus:border-blue-500 font-mono shadow-inner" value={others} onChange={e => setOthers(Number(e.target.value))} /></div>
                </div>
                <div><label className="text-[8px] text-slate-500 block mb-1 uppercase tracking-widest italic">Motivo / Rota</label><textarea className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-24 resize-none focus:border-emerald-500 uppercase shadow-inner italic" value={descricaoViagem} onChange={e => setDescricaoViagem(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvarViagem} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all active:scale-95 italic">Salvar Registro</button><button onClick={() => setIsModalViagemOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400 uppercase tracking-widest shadow-inner">Cancelar</button></div>
            </div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm uppercase">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto uppercase text-left">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 text-lg uppercase tracking-widest text-left italic">Gestão Técnica ANM</h2>
              <div className="space-y-4 font-black italic">
                 {/* Conteúdo do Modal Demanda (Responsável, Processo, Cliente, Título, etc...) mantido conforme v10.1 */}
                 <div><label className="text-[8px] text-slate-500 block mb-1 uppercase tracking-widest">Responsável Técnico *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase shadow-inner" value={atribuidoPara} onChange={e => setAtribuidoPara(e.target.value)}><option value="">SELECIONE UM PROFISSIONAL</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                 <div className="grid grid-cols-2 gap-3 uppercase">
                   <div><label className="text-[8px] text-slate-500 block mb-1">Processo ANM</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 shadow-inner font-mono" value={numProcesso} onChange={e => setNumProcesso(e.target.value)} /></div>
                   <div><label className="text-[8px] text-slate-500 block mb-1">Cliente</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 shadow-inner" value={cliente} onChange={e => setCliente(e.target.value)} /></div>
                 </div>
                 <div><label className="text-[8px] text-slate-500 block mb-1 uppercase tracking-widest">Título da Demanda</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 shadow-inner uppercase" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3 uppercase">
                   <div><label className="text-[8px] text-slate-500 block mb-1">Vencimento ANM</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 shadow-inner font-mono" value={vencimento} onChange={e => setVencimento(e.target.value)} /></div>
                   <div><label className="text-[8px] text-slate-500 block mb-1">Criticidade</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase shadow-inner" value={ranking} onChange={e => setRanking(e.target.value)}><option value="2">NORMAL</option><option value="3">URGENTE (!)</option><option value="4">CRÍTICA (!!!)</option></select></div>
                 </div>
                 <div><label className="text-[8px] text-emerald-500 block mb-1 uppercase italic tracking-widest">Link SEI / ANM</label><input placeholder="LINK DO PROCESSO" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 uppercase font-mono shadow-inner" value={linkProjeto} onChange={e => setLinkProjeto(e.target.value)} /></div>
                 <div><label className="text-[8px] text-emerald-500 block mb-1 uppercase italic tracking-widest">Notas Técnicas</label><textarea placeholder="DESCREVA OS DETALHES" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-24 uppercase outline-none focus:border-emerald-500 resize-none shadow-inner italic" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvar} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all active:scale-95 italic tracking-widest shadow-emerald-900/40">Salvar Operação</button><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400 uppercase tracking-widest shadow-inner">Fechar</button></div>
            </div>
          </div>
        )}

        {isFirstLogin && (
          <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] backdrop-blur-md uppercase text-center">
            <div className="bg-[#161b22] p-10 rounded border border-emerald-500/30 w-full max-w-md shadow-2xl text-center uppercase tracking-tighter shadow-emerald-900/40">
              <h2 className="text-2xl font-black mb-2 text-emerald-500 uppercase italic tracking-tighter shadow-emerald-900/40">Acesso Ecominas</h2>
              <p className="text-slate-500 text-[10px] mb-8 uppercase font-bold tracking-widest italic">Identidade Técnica Requerida</p>
              <div className="space-y-4 text-left font-black italic">
                <input className="w-full p-4 rounded bg-[#0d1117] border border-[#30363d] text-white uppercase font-bold outline-none focus:border-emerald-500 shadow-inner" value={nomeOnboarding} onChange={(e) => setNomeOnboarding(e.target.value)} placeholder="NOME DO PROFISSIONAL" />
                <select className="w-full p-4 rounded bg-[#0d1117] border border-[#30363d] text-white font-bold outline-none focus:border-emerald-500 uppercase shadow-inner" value={cargoOnboarding} onChange={(e) => setCargoOnboarding(e.target.value)}><option value="Engenheiro">Engenheiro</option><option value="Geólogo">Geólogo</option><option value="Coordenador">Coordenador</option><option value="Diretor">Diretor</option></select>
              </div>
              <button onClick={handleCriarPerfil} className="w-full mt-10 bg-emerald-600 hover:bg-emerald-500 p-5 rounded font-black uppercase text-xs shadow-lg transition-all active:scale-95 tracking-widest italic shadow-emerald-900/40">Sincronizar Acesso</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}