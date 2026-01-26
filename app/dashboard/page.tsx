'use client'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Sidebar } from './components/sidebar'
import { StatsCards } from './components/StatsCards'
import { Search, FileText, Map, ShieldCheck, FileCheck } from 'lucide-react'

export default function Dashboard() {
  const router = useRouter()
  
  // --- 1. ESTADOS ---
  const [activeTab, setActiveTab] = useState('demandas')
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('') 
  const [userCargo, setUserCargo] = useState('')
  const [loading, setLoading] = useState(true)

  // --- 2. DADOS ---
  const [demandas, setDemandas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([]) 
  const [viagens, setViagens] = useState<any[]>([])
  const [documentos, setDocumentos] = useState<any[]>([])
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  
  // Filtros
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalViagemOpen, setIsModalViagemOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // --- 3. CAMPOS VIAGEM ---
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

  // --- 4. CAMPOS DEMANDA ---
  const [numProcesso, setNumProcesso] = useState('')
  const [cliente, setCliente] = useState('')
  const [novoTitulo, setNovoTitulo] = useState('')
  const [vencimento, setVencimento] = useState('')
  const [ranking, setRanking] = useState('2')
  const [linkProjeto, setLinkProjeto] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [atribuidoPara, setAtribuidoPara] = useState('')

  // --- 5. ONBOARDING ---
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
    const { data: docData } = await supabase.from('documentos').select('*').order('created_at', { ascending: false })
    if (docData) setDocumentos(docData)
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
    // SÓ DIRETOR PODE EXCLUIR AGORA
    if (userCargo !== 'Diretor') return alert('Acesso Restrito ao Diretor.')
    if (confirm('Apagar viagem?')) { await supabase.from('viagens').delete().eq('id', id); carregarDados() }
  }

  async function handleConcluir(id: string) {
    if (!['Diretor', 'Coordenador', 'Engenheiro', 'Geólogo'].includes(userCargo)) return alert('Acesso Negado.')
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id); carregarDados()
  }

  async function handleSalvarViagem() {
    // TODOS OS TÉCNICOS PODEM LANÇAR
    if (!['Diretor', 'Coordenador', 'Engenheiro', 'Geólogo'].includes(userCargo)) return alert('Acesso Negado.')
    const payload = { responsavel_id: responsavelViagemId, nome_servico: viagemNome, data_inicio: viagemInicio || null, data_fim: viagemFim || null, participantes: participantesSelecionados.join(', '), km_inicial: kmInicial, km_final: kmFinal, adiantamento: adiantamento, custo_combustivel: fuel, custo_alimentacao: food, custo_hospedagem: hotel, custo_pedagio: toll, custo_outros: others, descricao: descricaoViagem }
    await supabase.from('viagens').insert([payload])
    setIsModalViagemOpen(false); limparCamposViagem(); carregarDados();
  }

  const toggleParticipante = (nome: string) => setParticipantesSelecionados(prev => prev.includes(nome) ? prev.filter(p => p !== nome) : [...prev, nome])
  
  function limparCamposViagem() { setResponsavelViagemId(''); setParticipantesSelecionados([]); setViagemNome(''); setViagemInicio(''); setViagemFim(''); setAdiantamento(0); setKmInicial(0); setKmFinal(0); setFuel(0); setFood(0); setHotel(0); setToll(0); setOthers(0); setDescricaoViagem(''); }
  function limparCampos() { setNumProcesso(''); setCliente(''); setNovoTitulo(''); setAtribuidoPara(''); setLinkProjeto(''); setNovaDescricao(''); setVencimento(''); setRanking('2'); }
  
  function exportarCSV() { /* CSV Demandas */ }
  
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
  const documentosFiltrados = documentos.filter(doc => doc.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || doc.tags?.includes(filtroTexto.toLowerCase()))
  const getDocIcon = (tipo: string) => { if (tipo === 'Licença') return <ShieldCheck className="text-emerald-500" size={24} />; if (tipo === 'Mapa') return <Map className="text-blue-500" size={24} />; if (tipo === 'Contrato') return <FileCheck className="text-yellow-500" size={24} />; return <FileText className="text-slate-500" size={24} /> }

  return (
    <div className="flex min-h-screen bg-[#0a0c10] text-[#d1d5db] font-sans uppercase overflow-hidden text-left">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userName={userName} userCargo={userCargo} />
      <div className="flex-1 overflow-y-auto p-8 relative">
        
        {/* === ABA DEMANDAS === */}
        {activeTab === 'demandas' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase">
              <div><h2 className="text-2xl font-black italic text-emerald-500">Escritório Técnico</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Monitoramento ANM</p></div>
              {(userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => { setEditId(null); limparCampos(); setIsModalOpen(true); }} className="bg-[#00c58e] text-black px-8 py-4 rounded font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase">+ Adicionar Demanda</button>}
            </div>
            <StatsCards stats={stats} />
            <div className="flex gap-2 items-center bg-[#161b22] p-4 border border-[#30363d] rounded-lg">
              <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg">{['Todas', 'Aberta', 'Concluído'].map((s) => (<button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black ${filtroStatus === s ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>{s}</button>))}</div>
              <input placeholder="FILTRAR..." className="flex-1 bg-[#0d1117] border border-[#30363d] p-4 rounded text-[11px] text-white font-bold outline-none focus:border-emerald-500 uppercase" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
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

        {/* === ABA VIAGENS (SÓ DIRETOR VÊ A TABELA) === */}
        {activeTab === 'viagens' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase text-left">
              <div><h2 className="text-2xl font-black italic text-emerald-500 uppercase tracking-tighter">Logística de Campo</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Prestação de Contas</p></div>
              <div className="flex gap-4">
                {userCargo === 'Diretor' && (<button onClick={exportarViagensCSV} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded font-black text-[10px] shadow-sm uppercase border border-[#30363d]">Baixar Relatório (CSV)</button>)}
                <button onClick={() => setIsModalViagemOpen(true)} className="bg-emerald-600 text-black px-8 py-4 rounded font-black text-[10px] active:scale-95 transition-all uppercase tracking-widest">+ Lançar Viagem</button>
              </div>
            </div>
            
            {/* CONDIÇÃO DE SEGURANÇA: SÓ DIRETOR VÊ A TABELA */}
            {userCargo === 'Diretor' ? (
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-hidden shadow-2xl">
                <table className="w-full text-left border-collapse text-[11px] font-bold uppercase">
                    <thead><tr className="bg-[#0d1117] text-[10px] font-black text-slate-500 border-b border-[#30363d]"><th className="p-4 border-r border-[#30363d]">VIAGEM / MOTORISTA</th><th className="p-4 border-r border-[#30363d] text-center">DIAS DE CAMPO</th><th className="p-4 border-r border-[#30363d] text-center">KM TOTAL</th><th className="p-4 border-r border-[#30363d] text-center">CUSTO TOTAL</th><th className="p-4 text-center">EQUIPE</th><th className="p-4 text-right">AÇÕES</th></tr></thead>
                    <tbody>{viagens.map((v) => {
                        const custoTotal = Number(v.custo_combustivel) + Number(v.custo_alimentacao) + Number(v.custo_hospedagem) + Number(v.custo_pedagio || 0) + Number(v.custo_outros || 0);
                        const saldo = (v.adiantamento || 0) - custoTotal;
                        return (
                    <React.Fragment key={v.id}>
                        <tr onClick={() => setExpandedId(expandedId === v.id ? null : v.id)} className="border-b border-[#30363d]/50 hover:bg-[#1c2128] cursor-pointer">
                        <td className="p-4 border-r border-[#30363d]/30 uppercase"><div>{expandedId === v.id ? '▼ ' : '▶ '}{v.nome_servico || 'SERVIÇO DE CAMPO'}<br/><span className="text-[9px] text-slate-500 italic">{v.perfis?.nome_completo || 'MOTORISTA'}</span></div></td>
                        <td className="p-4 border-r border-[#30363d]/30 text-center"><span className="block text-emerald-500 font-black">{calculateDays(v.data_inicio, v.data_fim)} DIAS</span></td>
                        <td className="p-4 border-r border-[#30363d]/30 text-center font-mono text-slate-300">{v.km_final - v.km_inicial} KM</td>
                        <td className="p-4 font-black border-r border-[#30363d]/30 text-center text-blue-400 font-mono">R$ {custoTotal.toFixed(2)}</td>
                        <td className="p-4 text-[9px] text-center">{v.participantes || 'SOLO'}</td>
                        <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>{(userCargo === 'Diretor') && <button onClick={() => handleExcluirViagem(v.id)} className="text-red-500">🗑️</button>}</td>
                        </tr>
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
            ) : (
                <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-12 text-center shadow-xl">
                    <h3 className="text-emerald-500 font-black text-lg mb-2 uppercase">Área de Lançamento</h3>
                    <p className="text-slate-400 text-xs max-w-md mx-auto mb-6 font-bold uppercase">A visualização dos relatórios financeiros é restrita à Diretoria. Utilize o botão acima para registrar suas atividades de campo.</p>
                </div>
            )}
          </div>
        )}

        {/* === ABA BIBLIOTECA === */}
        {activeTab === 'documentos' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center mb-8 bg-[#161b22] p-6 border border-[#30363d] rounded-lg shadow-xl uppercase">
              <div><h2 className="text-2xl font-black italic text-emerald-500">Biblioteca Digital</h2><p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">Acervo Técnico e Jurídico</p></div>
              <button className="bg-[#00c58e] text-black px-8 py-4 rounded font-black text-[10px] shadow-lg active:scale-95 transition-all uppercase">+ Novo Arquivo</button>
            </div>
            <div className="bg-[#161b22] p-6 rounded-lg border border-[#30363d] flex gap-4 items-center">
                <Search className="text-slate-500" />
                <input placeholder="PESQUISAR..." className="flex-1 bg-transparent text-white font-bold text-sm outline-none placeholder:text-slate-600" value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documentosFiltrados.map((doc) => (
                    <div key={doc.id} className="bg-[#161b22] border border-[#30363d] p-6 rounded-lg hover:border-emerald-500 transition-all cursor-pointer group">
                        <div className="flex justify-between items-start mb-4"><div className="p-3 bg-[#0d1117] rounded-lg border border-[#30363d] group-hover:border-emerald-500/50 transition-all">{getDocIcon(doc.tipo)}</div><span className="text-[9px] font-black text-slate-500 uppercase bg-[#0d1117] px-2 py-1 rounded">{doc.tipo}</span></div>
                        <h3 className="text-white font-bold text-sm mb-2 uppercase line-clamp-2">{doc.titulo}</h3>
                        <div className="flex flex-wrap gap-2 mb-4">{doc.tags?.split(',').map((tag: string, i: number) => (<span key={i} className="text-[8px] text-emerald-500 bg-emerald-900/10 px-2 py-1 rounded border border-emerald-500/10 uppercase">#{tag.trim()}</span>))}</div>
                        <div className="pt-4 border-t border-[#30363d] flex justify-between items-center"><span className="text-[9px] text-slate-500 font-mono">{new Date(doc.created_at).toLocaleDateString('pt-BR')}</span><button className="text-[9px] font-black text-white hover:text-emerald-500 transition-colors uppercase">BAIXAR ↓</button></div>
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* MODAL VIAGEM */}
        {isModalViagemOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm uppercase">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-emerald-500 font-black italic mb-6 border-b border-[#30363d] pb-2 text-lg uppercase tracking-widest text-left">Nova Viagem</h2>
              <div className="space-y-6 text-left">
                <div className="space-y-3">
                    <label className="text-[9px] text-emerald-500 font-bold tracking-widest block mb-2">1. DADOS DA MISSÃO</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2"><label className="text-[8px] font-black text-slate-500 block mb-1">Nome do Serviço</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={viagemNome} onChange={e => setViagemNome(e.target.value)} placeholder="EX: VISITA TÉCNICA" /></div>
                        <div><label className="text-[8px] font-black text-slate-500 block mb-1">Responsável (Motorista)</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={responsavelViagemId} onChange={e => setResponsavelViagemId(e.target.value)}><option value="">SELECIONE</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo}</option>))}</select></div>
                        <div><label className="text-[8px] font-black text-slate-500 block mb-1">Equipe</label><div className="flex flex-wrap gap-2 p-2 bg-[#0d1117] border border-[#30363d] rounded min-h-[42px]">{equipe.map(tec => (<button key={tec.id} onClick={() => toggleParticipante(tec.nome_completo)} className={`px-2 py-1 rounded text-[8px] font-black ${participantesSelecionados.includes(tec.nome_completo) ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{participantesSelecionados.includes(tec.nome_completo) ? '✓' : '+'} {tec.nome_completo.split(' ')[0]}</button>))}</div></div>
                    </div>
                </div>
                <div className="space-y-3 pt-2 border-t border-[#30363d]">
                    <label className="text-[9px] text-emerald-500 font-bold tracking-widest block mb-2">2. LOGÍSTICA & CAIXA</label>
                    <div className="grid grid-cols-3 gap-4">
                        <div><label className="text-[8px] font-black text-slate-500 block mb-1">Início</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={viagemInicio} onChange={e => setViagemInicio(e.target.value)} /></div>
                        <div><label className="text-[8px] font-black text-slate-500 block mb-1">Fim</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500" value={viagemFim} onChange={e => setViagemFim(e.target.value)} /></div>
                        <div><label className="text-[8px] font-black text-emerald-400 block mb-1">Adiantamento (R$)</label><input type="number" className="w-full bg-[#0d1117] border border-emerald-500/50 p-3 text-xs text-white font-mono outline-none focus:border-emerald-500" value={adiantamento} onChange={e => setAdiantamento(Number(e.target.value))} placeholder="0.00" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-[8px] font-black text-slate-500 block mb-1">Km Inicial</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={kmInicial} onChange={e => setKmInicial(Number(e.target.value))} /></div>
                        <div><label className="text-[8px] font-black text-slate-500 block mb-1">Km Final</label><input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={kmFinal} onChange={e => setKmFinal(Number(e.target.value))} /></div>
                    </div>
                </div>
                <div className="space-y-3 pt-2 border-t border-[#30363d]">
                    <label className="text-[9px] text-emerald-500 font-bold tracking-widest block mb-2">3. DESPESAS REALIZADAS</label>
                    <div className="grid grid-cols-5 gap-2 text-[8px]">
                        <div>Combustível<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white mt-1" value={fuel} onChange={e => setFuel(Number(e.target.value))} /></div>
                        <div>Alimentação<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white mt-1" value={food} onChange={e => setFood(Number(e.target.value))} /></div>
                        <div>Hospedagem<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white mt-1" value={hotel} onChange={e => setHotel(Number(e.target.value))} /></div>
                        <div>Pedágio<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white mt-1" value={toll} onChange={e => setToll(Number(e.target.value))} /></div>
                        <div>Outros<input type="number" className="w-full bg-[#0d1117] border border-[#30363d] p-2 text-white mt-1" value={others} onChange={e => setOthers(Number(e.target.value))} /></div>
                    </div>
                    <textarea className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-16 resize-none focus:border-emerald-500 mt-2" placeholder="OBSERVAÇÕES DA VIAGEM..." value={descricaoViagem} onChange={e => setDescricaoViagem(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-4 mt-6"><button onClick={handleSalvarViagem} className="flex-1 bg-emerald-600 p-4 font-black text-xs text-black hover:bg-emerald-500">SALVAR REGISTRO</button><button onClick={() => setIsModalViagemOpen(false)} className="flex-1 bg-slate-800 p-4 font-black text-xs text-slate-400 hover:text-white">CANCELAR</button></div>
            </div>
          </div>
        )}

        {/* MODAL DEMANDA (COMPLETO E RESTAURADO) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm uppercase">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto uppercase text-left">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 text-lg uppercase tracking-widest text-left italic">Gestão Técnica ANM</h2>
              <div className="space-y-4 font-black italic">
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase tracking-widest">Responsável Técnico *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase shadow-inner" value={atribuidoPara} onChange={e => setAtribuidoPara(e.target.value)}><option value="">SELECIONE UM PROFISSIONAL</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                 <div className="grid grid-cols-2 gap-3 uppercase">
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1">Processo ANM</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 shadow-inner font-mono" value={numProcesso} onChange={e => setNumProcesso(e.target.value)} /></div>
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1">Cliente</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 shadow-inner" value={cliente} onChange={e => setCliente(e.target.value)} /></div>
                 </div>
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1 uppercase tracking-widest">Título da Demanda</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 shadow-inner uppercase" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3 uppercase">
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1">Vencimento ANM</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 shadow-inner font-mono" value={vencimento} onChange={e => setVencimento(e.target.value)} /></div>
                   <div><label className="text-[8px] font-black text-slate-500 block mb-1">Criticidade</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold outline-none focus:border-emerald-500 uppercase shadow-inner" value={ranking} onChange={e => setRanking(e.target.value)}><option value="2">NORMAL</option><option value="3">URGENTE (!)</option><option value="4">CRÍTICA (!!!)</option></select></div>
                 </div>
                 <div><label className="text-[8px] font-black text-emerald-500 block mb-1 uppercase italic tracking-widest">Link SEI / ANM</label><input placeholder="LINK DO PROCESSO" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white outline-none focus:border-emerald-500 uppercase font-mono shadow-inner" value={linkProjeto} onChange={e => setLinkProjeto(e.target.value)} /></div>
                 <div><label className="text-[8px] font-black text-emerald-500 block mb-1 uppercase italic tracking-widest">Notas Técnicas</label><textarea placeholder="DESCREVA OS DETALHES" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-24 uppercase outline-none focus:border-emerald-500 resize-none shadow-inner italic" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvar} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all active:scale-95 italic tracking-widest shadow-emerald-900/40">Salvar Operação</button><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400 uppercase tracking-widest shadow-inner italic">Fechar</button></div>
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