'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sidebar } from './components/sidebar'
import { StatsCards } from './components/StatsCards'

export default function Dashboard() {
  const router = useRouter()
  
  // --- 1. ESTADOS GERAIS ---
  const [activeTab, setActiveTab] = useState('demandas')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('') 
  const [userCargo, setUserCargo] = useState('')
  const [loading, setLoading] = useState(true)

  // --- 2. DADOS ---
  const [demandas, setDemandas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([]) 
  const [viagens, setViagens] = useState<any[]>([])
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // --- 3. MODAIS ---
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalViagemOpen, setIsModalViagemOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // --- 4. CAMPOS VIAGEM ---
  const [responsavelViagemId, setResponsavelViagemId] = useState('')
  const [participantesSelecionados, setParticipantesSelecionados] = useState<string[]>([])
  const [viagemNome, setViagemNome] = useState('')       
  const [viagemInicio, setViagemInicio] = useState('')   
  const [viagemFim, setViagemFim] = useState('')         
  const [adiantamento, setAdiantamento] = useState(0)
  const [kmInicial, setKmInicial] = useState(0); const [kmFinal, setKmFinal] = useState(0)
  const [fuel, setFuel] = useState(0); const [food, setFood] = useState(0); const [hotel, setHotel] = useState(0)
  const [toll, setToll] = useState(0); const [others, setOthers] = useState(0)
  const [descricaoViagem, setDescricaoViagem] = useState('')

  // --- 5. CAMPOS DEMANDA ---
  const [numProcesso, setNumProcesso] = useState('')
  const [cliente, setCliente] = useState('')
  const [novoTitulo, setNovoTitulo] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [ranking, setRanking] = useState('2')
  const [linkProjeto, setLinkProjeto] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [atribuidoPara, setAtribuidoPara] = useState('')

  // --- 6. ONBOARDING ---
  const [nomeOnboarding, setNomeOnboarding] = useState('')
  const [cargoOnboarding, setCargoOnboarding] = useState('Engenheiro')

  // --- CARREGAMENTO ---
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
      if (perfil) { setUserName(perfil.nome_completo); setUserCargo(perfil.cargo); } else { setIsFirstLogin(true); }
      carregarDados()
    }
    inicializar()
  }, [router])

  // --- HELPERS ---
  const calculateDays = (start: string, end: string) => { if (!start || !end) return 0; const diff = Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)); return diff + 1 }
  const formatDate = (s: string) => s ? new Date(s).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}) : ''
  const hoje = new Date(); const hojeStr = hoje.toISOString().split('T')[0]
  const stats = { abertas: demandas.filter(d => d.status === 'Aberta').length, concluidas: demandas.filter(d => d.status === 'Concluído').length, atrasadas: demandas.filter(d => d.status === 'Aberta' && d.vencimento && d.vencimento < hojeStr).length }

  // --- AÇÕES ---
  async function handleCriarPerfil() {
    if (!nomeOnboarding) return alert('Digite seu nome.')
    const { error } = await supabase.from('perfis').insert([{ id: userId, nome_completo: nomeOnboarding, cargo: cargoOnboarding }])
    if (!error) { setUserName(nomeOnboarding); setUserCargo(cargoOnboarding); setIsFirstLogin(false); carregarDados(); }
  }

  async function handleSalvar() {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Negado.')
    const payload = { num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, ranking: parseInt(ranking), link_projeto: linkProjeto, descricao: novaDescricao, status: 'Aberta', atribuido_a_id: atribuidoPara || null }
    const { error } = editId ? await supabase.from('demandas').update(payload).eq('id', editId) : await supabase.from('demandas').insert([{ ...payload, criado_por_id: userId }])
    if (!error) { setIsModalOpen(false); setEditId(null); carregarDados(); }
  }

  async function handleExcluir(id: string) {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Restrito.')
    if (confirm('Apagar demanda?')) { await supabase.from('demandas').delete().eq('id', id); carregarDados() }
  }

  async function handleExcluirViagem(id: string) {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Restrito.')
    if (confirm('Apagar viagem?')) { await supabase.from('viagens').delete().eq('id', id); carregarDados() }
  }

  async function handleConcluir(id: string) {
    if (!['Diretor', 'Coordenador', 'Engenheiro', 'Geólogo'].includes(userCargo)) return alert('Acesso Negado.')
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id); carregarDados()
  }

  async function handleSalvarViagem() {
    if (userCargo !== 'Diretor' && userCargo !== 'Coordenador') return alert('Acesso Negado.')
    const payload = { responsavel_id: responsavelViagemId, nome_servico: viagemNome, data_inicio: viagemInicio || null, data_fim: viagemFim || null, participantes: participantesSelecionados.join(', '), km_inicial: kmInicial, km_final: kmFinal, adiantamento: adiantamento, custo_combustivel: fuel, custo_alimentacao: food, custo_hospedagem: hotel, custo_pedagio: toll, custo_outros: others, descricao: descricaoViagem }
    await supabase.from('viagens').insert([payload])
    setIsModalViagemOpen(false); limparCamposViagem(); carregarDados();
  }

  const toggleParticipante = (nome: string) => setParticipantesSelecionados(prev => prev.includes(nome) ? prev.filter(p => p !== nome) : [...prev, nome])
  
  function limparCamposViagem() { setResponsavelViagemId(''); setParticipantesSelecionados([]); setViagemNome(''); setViagemInicio(''); setViagemFim(''); setAdiantamento(0); setKmInicial(0); setKmFinal(0); setFuel(0); setFood(0); setHotel(0); setToll(0); setOthers(0); setDescricaoViagem(''); }
  function limparCampos() { setNumProcesso(''); setCliente(''); setNovoTitulo(''); setAtribuidoPara(''); setLinkProjeto(''); setNovaDescricao(''); setVencimento(''); setRanking('2'); }
  
  function exportarCSV() {
    const cabecalho = "Processo,Cliente,Titulo,Responsavel,Vencimento,Status\n"
    const csv = demandas.map(d => `${d.num_processo},${d.cliente},${d.titulo},${d.perfis?.nome_completo || 'N/A'},${d.vencimento},${d.status}`).join("\n")
    const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "demandas_ecominas.csv"); link.click()
  }

  function exportarViagensCSV() {
    const cabecalho = "Servico,Motorista,Inicio,Fim,Adiantamento,Custo_Total,Saldo,Equipe,Descricao\n"
    const csv = viagens.map(v => {
      const custo = Number(v.custo_combustivel) + Number(v.custo_alimentacao) + Number(v.custo_hospedagem) + Number(v.custo_pedagio || 0) + Number(v.custo_outros || 0)
      const saldo = (v.adiantamento || 0) - custo
      const descLimpa = v.descricao ? v.descricao.replace(/(\r\n|\n|\r)/gm, " ").replace(/"/g, '""') : ""
      return `"${v.nome_servico || 'N/A'}","${v.perfis?.nome_completo || 'N/A'}",${v.data_inicio || ''},${v.data_fim || ''},${v.adiantamento || 0},${custo.toFixed(2)},${saldo.toFixed(2)},"${v.participantes || ''}","${descLimpa}"`
    }).join("\n")
    const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "relatorio_viagens.csv"); link.click()
  }

  const getRowColor = (item: any) => { if (item.status === 'Concluído') return 'bg-[#238636]/15 text-[#2fb344]'; if (item.vencimento && item.vencimento < hojeStr) return 'bg-[#da3633]/20 text-[#f85149] border-l-4 border-red-600 font-bold'; return 'hover:bg-[#1c2128]' }
  const filtradas = demandas.filter(d => (d.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || d.num_processo?.includes(filtroTexto)) && (filtroStatus === 'Todas' ? true : d.status === filtroStatus))

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-[#d1d5db] font-sans uppercase overflow-hidden text-left">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userName={userName} userCargo={userCargo} />
      <div className="flex-1 overflow-y-auto p-8 relative">
        
        {/* ABA DEMANDAS */}
        {activeTab === 'demandas' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase">
              <div><h2 className="text-2xl font-black italic text-emerald-500">Demandas Escritório</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Gestão de Atividades</p></div>
              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => { setEditId(null); limparCampos(); setIsModalOpen(true); }} className="bg-[#00c58e] text-black px-8 py-4 rounded font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase">+ Adicionar Demanda</button>}
            </div>
            <StatsCards stats={stats} />
            <div className="flex gap-2 items-center bg-[#161b22] p-4 border border-[#30363d] rounded-lg">
              <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg">{['Todas', 'Aberta', 'Concluído'].map((s) => (<button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black ${filtroStatus === s ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>{s}</button>))}</div>
              <input placeholder="FILTRAR..." className="flex-1 bg-[#0d1117] border border-[#30363d] p-4 rounded text-[11px] text-white font-bold outline-none focus:border-emerald-500 uppercase" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
              <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-6 py-4 rounded text-[10px] font-black text-white border border-[#30363d] shadow-sm uppercase">CSV</button>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-bold">
                <thead><tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]"><th className="p-4 border-r border-[#30363d]">DEMANDA / CLIENTE</th><th className="p-4 border-r border-[#30363d]">RESPONSÁVEL</th><th className="p-4 border-r border-[#30363d]">VENCIMENTO</th><th className="p-4 border-r border-[#30363d]">DIAS</th><th className="p-4 border-r border-[#30363d]">ANM</th><th className="p-4 text-right">AÇÕES</th></tr></thead>
                <tbody>{filtradas.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr onClick={() => setExpandedId(expandedId === item.id ? null : item.id)} className={`border-b border-[#30363d]/50 cursor-pointer ${getRowColor(item)}`}>
                      <td className="p-4 uppercase"><div>{expandedId === item.id ? '▼ ' : '▶ '}{item.titulo}<br/><span className="text-[9px] italic opacity-60 uppercase">{item.cliente}</span></div></td>
                      <td className="p-4 uppercase text-[9px]">{item.perfis?.nome_completo || 'PENDENTE'}</td>
                      <td className="p-4 font-mono">{item.vencimento ? new Date(item.vencimento).toLocaleDateString('pt-BR') : '--'}</td>
                      <td className="p-4 font-black">{item.vencimento ? Math.ceil((new Date(item.vencimento).getTime() - hoje.getTime()) / (1000 * 3600 * 24)) : 0}</td>
                      <td className="p-4 font-mono text-emerald-500 uppercase">{item.num_processo || '--'}</td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}><div className="flex justify-end gap-3 items-center">{item.status !== 'Concluído' && <button onClick={() => handleConcluir(item.id)} className="bg-white/10 px-3 py-1 rounded text-[9px]">OK</button>}{(userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => handleExcluir(item.id)} className="text-red-500">🗑️</button>}</div></td>
                    </tr>
                    {expandedId === item.id && (<tr className="bg-[#0d1117] border-b border-[#30363d]"><td colSpan={6} className="p-6"><div className="grid grid-cols-2 gap-8 uppercase"><div><h4 className="text-emerald-500 text-[9px] font-black">Link SEI</h4>{item.link_projeto || '--'}</div><div><h4 className="text-emerald-500 text-[9px] font-black">Notas</h4>{item.descricao || '--'}</div></div></td></tr>)}
                  </React.Fragment>
                ))}</tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA VIAGENS (LAYOUT NOVO) */}
        {activeTab === 'viagens' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase text-left">
              <div><h2 className="text-2xl font-black italic text-emerald-500 uppercase tracking-tighter">Logística de Campo</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Prestação de Contas</p></div>
              <div className="flex gap-4">
                <button onClick={exportarViagensCSV} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded font-black text-[10px] shadow-sm uppercase border border-[#30363d]">Baixar Relatório (CSV)</button>
                {(userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => setIsModalViagemOpen(true)} className="bg-emerald-600 text-black px-8 py-4 rounded font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest">+ Lançar Viagem</button>}
              </div>
            </div>
            <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
              <table className="w-full text-left border-collapse text-[11px] font-bold uppercase">
                <thead><tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]"><th className="p-4 border-r border-[#30363d]">VIAGEM / MOTORISTA</th><th className="p-4 border-r border-[#30363d]">DIAS DE CAMPO</th><th className="p-4 border-r border-[#30363d]">KM TOTAL</th><th className="p-4 border-r border-[#30363d]">CUSTO TOTAL</th><th className="p-4 text-center">EQUIPE</th><th className="p-4 text-right">AÇÕES</th></tr></thead>
                <tbody>{viagens.map((v) => {
                    const custoTotal = Number(v.custo_combustivel) + Number(v.custo_alimentacao) + Number(v.custo_hospedagem) + Number(v.custo_pedagio || 0) + Number(v.custo_outros || 0);
                    const saldo = (v.adiantamento || 0) - custoTotal;
                    return (
                  <React.Fragment key={v.id}>
                    <tr onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="border-b border-[#30363d]/50 hover:bg-[#1c2128] cursor-pointer">
                      {/* 1. Viagem e Motorista */}
                      <td className="p-4 border-r border-[#30363d]/30 uppercase"><div>{expandedId === v.id ? '▼ ' : '▶ '}{v.nome_servico || 'SERVIÇO DE CAMPO'}<br/><span className="text-[9px] text-slate-500 italic">{v.perfis?.nome_completo || 'MOTORISTA'}</span></div></td>
                      {/* 2. Dias de Campo (Calculado) */}
                      <td className="p-4 border-r border-[#30363d]/30 text-center"><span className="block text-emerald-500 font-black">{calculateDays(v.data_inicio, v.data_fim)} DIAS</span></td>
                      {/* 3. KM Total */}
                      <td className="p-4 border-r border-[#30363d]/30 text-center font-mono text-slate-300">{v.km_final - v.km_inicial} KM</td>
                      {/* 4. Custo Total */}
                      <td className="p-4 font-black border-r border-[#30363d]/30 text-blue-400 font-mono">R$ {custoTotal.toFixed(2)}</td>
                      {/* 5. Equipe */}
                      <td className="p-4 text-[9px] text-center">{v.participantes || 'SOLO'}</td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>{(userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => handleExcluirViagem(v.id)} className="text-red-500">🗑️</button>}</td>
                    </tr>
                    {/* VISÃO DETALHADA FINANCEIRA */}
                    {expandedId === v.id && (<tr className="bg-[#0d1117] border-b border-[#30363d]"><td colSpan={6} className="p-6">
                        <div className="mb-4 p-4 border border-slate-700 bg-slate-900/50 rounded grid grid-cols-3 gap-4 text-center">
                           <div><p className="text-[10px] text-slate-500 font-bold uppercase">Período</p><p className="text-xs text-white font-mono">{formatDate(v.data_inicio)} até {formatDate(v.data_fim)}</p></div>
                           <div><p className="text-[10px] text-slate-500 font-bold uppercase">Adiantamento</p><p className="text-xs text-emerald-400 font-mono">R$ {v.adiantamento || 0}</p></div>
                           <div><p className="text-[10px] text-slate-500 font-bold uppercase">Saldo Final</p><p className={`text-xs font-black font-mono ${saldo >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>R$ {saldo.toFixed(2)}</p></div>
                        </div>
                        <div className="grid grid-cols-5 gap-4 mb-4 text-center">
                          <div className="bg-[#161b22] p-2 border border-[#30363d]"><p className="text-[8px]">COMBUSTÍVEL</p>R$ {v.custo_combustivel}</div>
                          <div className="bg-[#161b22] p-2 border border-[#30363d]"><p className="text-[8px]">ALIMENTAÇÃO</p>R$ {v.custo_alimentacao}</div>
                          <div className="bg-[#161b22] p-2 border border-[#30363d]"><p className="text-[8px]">HOSPEDAGEM</p>R$ {v.custo_hospedagem}</div>
                          <div className="bg-[#161b22] p-2 border border-[#30363d]"><p className="text-[8px]">PEDÁGIO</p>R$ {v.custo_pedagio}</div>
                          <div className="bg-[#161b22] p-2 border border-[#30363d]"><p className="text-[8px]">OUTROS</p>R$ {v.custo_outros}</div>
                        </div><div className="bg-[#161b22] p-4 border border-[#30363d]"><h4 className="text-emerald-500 text-[9px]">Rota / Obs</h4>{v.descricao || '--'}</div></td></tr>)}
                  </React.Fragment>
                )})}</tbody>
              </table>
            </div>
          </div>
        )}
        {/* MODAL VIAGEM */}
        {isModalViagemOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm uppercase">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-2xl shadow-2xl overflow-y-auto">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2">Financeiro de Viagem</h2>
              <div className="space-y-6 text-left">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1"><label className="text-[8px] font-black text-slate-500 block mb-1">Nome do Serviço</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={viagemNome} onChange={e => setViagemNome(e.target.value)} placeholder="EX: VISITA TÉCNICA" /></div>
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1">Início</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={viagemInicio} onChange={e => setViagemInicio(e.target.value)} /></div>
                  <div><label className="text-[8px] font-black text-slate-500 block mb-1">Fim</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={viagemFim} onChange={e => setViagemFim(e.target.value)} /></div>
                </div>
                <div className="bg-emerald-900/10 p-4 border border-emerald-500/30 rounded"><label className="text-[10px] font-black text-emerald-500 block mb-2 tracking-widest">ADIANTAMENTO / CAIXA (R$)</label><input type="number" className="w-full bg-[#0d1117] border border-emerald-500/50 p-4 text-lg font-mono text-white outline-none focus:border-emerald-500 shadow-inner" value={adiantamento} onChange={e => setAdiantamento(Number(e.target.value))} placeholder="0.00" /></div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-1">Motorista</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={responsavelViagemId} onChange={e => setResponsavelViagemId(e.target.value)}><option value="">SELECIONE</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo}</option>))}</select></div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-1">Equipe</label><div className="flex flex-wrap gap-2 p-3 bg-[#0d1117] border border-[#30363d] rounded">{equipe.map(tec => (<button key={tec.id} onClick={() => toggleParticipante(tec.nome_completo)} className={`px-3 py-2 rounded text-[9px] font-black ${participantesSelecionados.includes(tec.nome_completo) ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{participantesSelecionados.includes(tec.nome_completo) ? '✓ ' : '+'} {tec.nome_completo}</button>))}</div></div>
                <div className="grid grid-cols-2 gap-4"><div><label className="text-[8px] font-black text-slate-500">Km Inicial</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={kmInicial} onChange={e => setKmInicial(Number(e.target.value))} /></div><div><label className="text-[8px] font-black text-slate-500">Km Final</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={kmFinal} onChange={e => setKmFinal(Number(e.target.value))} /></div></div>
                <div className="grid grid-cols-5 gap-2 text-[8px]">
                  <div>Combustível<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white" value={fuel} onChange={e => setFuel(Number(e.target.value))} /></div>
                  <div>Alimentação<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white" value={food} onChange={e => setFood(Number(e.target.value))} /></div>
                  <div>Hospedagem<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white" value={hotel} onChange={e => setHotel(Number(e.target.value))} /></div>
                  <div>Pedágio<input type="number" className="w-full bg-[#0d1117] border border-emerald-500/30 p-2 text-white" value={toll} onChange={e => setToll(Number(e.target.value))} /></div>
                  <div>Outros<input type="number" className="w-full bg-[#0d1117] border border-blue-500/30 p-2 text-white" value={others} onChange={e => setOthers(Number(e.target.value))} /></div>
                </div>
                <div><label className="text-[8px] font-black text-slate-500 block mb-1">Rota / Obs</label><textarea className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-20" value={descricaoViagem} onChange={e => setDescricaoViagem(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-6"><button onClick={handleSalvarViagem} className="flex-1 bg-emerald-600 p-4 font-black text-xs text-black">SALVAR</button><button onClick={() => setIsModalViagemOpen(false)} className="flex-1 bg-slate-800 p-4 font-black text-xs text-slate-400">CANCELAR</button></div>
            </div>
          </div>
        )}
        {isModalOpen && (<div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm uppercase"><div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-lg shadow-2xl"><h2 className="text-emerald-500 font-black italic mb-8">Nova Demanda</h2><div className="space-y-4"><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" placeholder="TÍTULO" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} /><div className="flex gap-2"><button onClick={handleSalvar} className="flex-1 bg-emerald-600 p-3 font-black text-xs text-black">SALVAR</button><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 p-3 font-black text-xs text-slate-400">CANCELAR</button></div></div></div></div>)}
        {isFirstLogin && (<div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-[100]"><div className="bg-[#161b22] p-10 rounded border border-emerald-500/30 w-full max-w-md text-center"><h2 className="text-2xl font-black text-emerald-500 mb-4">Acesso</h2><input className="w-full p-4 mb-4 bg-[#0d1117] border border-[#30363d] text-white" value={nomeOnboarding} onChange={e => setNomeOnboarding(e.target.value)} placeholder="SEU NOME" /><button onClick={handleCriarPerfil} className="w-full bg-emerald-600 p-4 font-black text-black">ENTRAR</button></div></div>)}
      </div>
    </div>
  )
}