'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const router = useRouter()
  
  // 1. IDENTIDADE E PERMISSÕES
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Gabriel Matiazo') 
  const [userCargo, setUserCargo] = useState('Diretor')

  // 2. ESTADOS DO SISTEMA E EQUIPE
  const [demandas, setDemandas] = useState<any[]>([])
  const [equipe, setEquipe] = useState<any[]>([]) 
  const [loading, setLoading] = useState(true)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('Todas')

  // 3. ESTADOS DO FORMULÁRIO (MODAL)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [numProcesso, setNumProcesso] = useState('') 
  const [cliente, setCliente] = useState('')
  const [novoTitulo, setNovoTitulo] = useState('')   
  const [vencimento, setVencimento] = useState('')
  const [ranking, setRanking] = useState('2')         
  const [novaDescricao, setNovaDescricao] = useState('')
  const [atribuidoPara, setAtribuidoPara] = useState('')
  const [nomeOnboarding, setNomeOnboarding] = useState('')

  // 4. CARREGAMENTO DE DADOS (JOIN COM PERFIS)
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
      .in('cargo', ['Engenheiro', 'Geólogo', 'Diretor', 'Coordenador'])
    if (eData) setEquipe(eData)
    setLoading(false)
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data: perfil } = await supabase.from('perfis').select('nome_completo, cargo').eq('id', user.id).single()
      if (perfil) {
        setUserName(perfil.nome_completo)
        setUserCargo(perfil.cargo)
      } else {
        setIsFirstLogin(true)
      }
      carregarDados()
    }
    inicializar()
  }, [router])

  // 5. AÇÕES TÉCNICAS E HANDLERS
  async function handleSalvar() {
    if (!numProcesso || !novoTitulo) return alert('Campos Processo e Título são obrigatórios!')
    const payload = { 
      num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, 
      ranking: parseInt(ranking), descricao: novaDescricao, status: 'Aberta', atribuido_a_id: atribuidoPara || null 
    }

    const { error } = editId 
      ? await supabase.from('demandas').update(payload).eq('id', editId)
      : await supabase.from('demandas').insert([{ ...payload, criado_por_id: userId }])

    if (!error) { 
      setIsModalOpen(false); 
      setEditId(null);
      setNumProcesso(''); setCliente(''); setNovoTitulo(''); setAtribuidoPara(''); setNovaDescricao('');
      carregarDados(); 
    }
  }

  // Função para o botão "OK" (Corrigida e inserida no escopo)
  async function handleConcluir(id: string) {
    await supabase.from('demandas').update({ status: 'Concluído' }).eq('id', id)
    carregarDados() // Atualiza a tabela industrial após concluir
  }

  async function handleCriarPerfil() {
    if (!nomeOnboarding) return alert('Por favor, digite seu nome completo.')
    const { error } = await supabase.from('perfis').insert([{ 
      id: userId, nome_completo: nomeOnboarding, cargo: 'Engenheiro', empresa: 'Ecominas Mineração' 
    }])
    if (!error) { setUserName(nomeOnboarding); setIsFirstLogin(false); carregarDados(); }
  }

  function exportarCSV() {
    const cabecalho = "Processo,Cliente,Titulo,Responsavel,Vencimento,Status\n"
    const csv = demandas.map(d => `${d.num_processo},${d.cliente},${d.titulo},${d.perfis?.nome_completo || 'N/A'},${d.vencimento},${d.status}`).join("\n")
    const blob = new Blob([cabecalho + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", "ecominas_demandas.csv"); link.click()
  }

  // 6. LÓGICA DE INTERFACE
  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]
  const filtradas = demandas.filter(d => {
    const busca = d.titulo?.toLowerCase().includes(filtroTexto.toLowerCase()) || d.num_processo?.includes(filtroTexto)
    const status = filtroStatus === 'Todas' ? true : d.status === filtroStatus
    return busca && status
  })

  const c_abertas = demandas.filter(d => d.status !== 'Concluído').length
  const c_concluidas = demandas.filter(d => d.status === 'Concluído').length
  const c_atrasadas = demandas.filter(d => d.status !== 'Concluído' && d.vencimento && d.vencimento < hojeStr).length

  return (
    <div className="min-h-screen bg-[#0a0c10] text-[#d1d5db] p-4 font-sans uppercase">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER OPERACIONAL */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 bg-[#161b22] p-4 border border-[#30363d] rounded-lg gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-600 px-4 py-2 font-black text-white italic text-xl rounded shadow-lg shadow-emerald-900/40">ECOMINAS</div>
            <div>
              <h1 className="text-[10px] font-black text-white tracking-widest uppercase">Central de Demandas</h1>
              <p className="text-[9px] text-slate-500 font-bold">RESPONSÁVEL: {userName} ({userCargo})</p>
            </div>
          </div>
          
          <div className="flex gap-2 bg-[#0d1117] p-1 rounded-lg border border-[#30363d]">
            {['Todas', 'Aberta', 'Concluído'].map((s) => (
              <button key={s} onClick={() => setFiltroStatus(s)} className={`px-4 py-2 rounded text-[9px] font-black transition-all ${filtroStatus === s ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}>{s}</button>
            ))}
          </div>

          {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
            <button onClick={() => { setEditId(null); setIsModalOpen(true); }} className="bg-[#00c58e] hover:bg-[#00a87a] text-black px-6 py-3 rounded font-black text-[10px] uppercase shadow-lg">+ ADICIONAR DEMANDA</button>
          )}
        </div>

        {/* CONTADORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#161b22] p-6 border border-[#30363d] rounded-lg">
            <h3 className="text-slate-500 text-[9px] font-black tracking-widest">EM ABERTO</h3>
            <p className="text-4xl font-black text-emerald-500 mt-1">{c_abertas}</p>
          </div>
          <div className="bg-[#161b22] p-6 border border-[#30363d] rounded-lg">
            <h3 className="text-slate-500 text-[9px] font-black tracking-widest">CONCLUÍDAS</h3>
            <p className="text-4xl font-black text-blue-500 mt-1">{c_concluidas}</p>
          </div>
          <div className="bg-[#161b22] p-6 border border-red-900/30 rounded-lg animate-pulse">
            <h3 className="text-red-500/50 text-[9px] font-black tracking-widest">ATRASADAS</h3>
            <p className="text-4xl font-black text-red-600 mt-1">{c_atrasadas}</p>
          </div>
        </div>

        {/* BUSCA E EXPORTAÇÃO */}
        <div className="flex gap-2 mb-4">
          <input placeholder="FILTRAR POR PROCESSO, TÍTULO OU CLIENTE..." className="flex-1 bg-[#0d1117] border border-[#30363d] p-4 rounded text-[11px] text-white font-bold outline-none focus:border-emerald-500 uppercase transition-all" value={filtroTexto} onChange={e => setFiltroTexto(e.target.value)} />
          <button onClick={exportarCSV} className="bg-slate-800 hover:bg-slate-700 px-6 rounded text-[10px] font-black text-white border border-[#30363d] transition-colors">EXPORTAR CSV</button>
        </div>

        {/* TABELA INDUSTRIAL */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-lg overflow-x-auto shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0d1117] text-[10px] uppercase font-black text-slate-500 tracking-tighter border-b border-[#30363d]">
                <th className="p-4 border-r border-[#30363d]">Demanda / Notas Técnicas</th>
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
                const dias = dataVenc ? Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 3600 * 24)) : 0
                const isCritico = (dias < 0 && item.status !== 'Concluído') || item.ranking >= 3
                return (
                  <tr key={item.id} className={`border-b border-[#30363d]/50 transition-all ${isCritico ? 'bg-[#ff4400] text-white' : 'hover:bg-[#1c2128]'}`}>
                    <td className="p-4"><p className="uppercase">{item.titulo}</p><p className={`text-[9px] italic ${isCritico ? 'text-white/70' : 'text-slate-500'}`}>{item.cliente}</p></td>
                    <td className="p-4"><span className="bg-emerald-900/30 text-emerald-400 px-2 py-1 rounded text-[9px] font-black">{item.perfis?.nome_completo || 'NÃO ATRIBUÍDO'}</span></td>
                    <td className="p-4 font-mono">{dataVenc ? dataVenc.toLocaleDateString('pt-BR') : '--'}</td>
                    <td className="p-4 font-black">{dias}</td>
                    <td className="p-4 font-mono text-emerald-500">{item.num_processo}</td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {item.status !== 'Concluído' && (userCargo === 'Diretor' || userCargo === 'Coordenador') && <button onClick={() => handleConcluir(item.id)} className="bg-white/20 hover:bg-white/40 px-3 py-1 rounded text-[9px] font-black uppercase">OK</button>}
                        {(userCargo === 'Diretor') && <button onClick={() => { setEditId(item.id); setNumProcesso(item.num_processo); setNovoTitulo(item.titulo); setCliente(item.cliente); setVencimento(item.vencimento || ''); setAtribuidoPara(item.atribuido_a_id || ''); setIsModalOpen(true); }} className="p-1 hover:text-blue-400 transition-colors">✎</button>}
                        {(userCargo === 'Diretor') && <button onClick={() => supabase.from('demandas').delete().eq('id', item.id).then(() => carregarDados())} className="p-1 hover:text-black">🗑️</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* MODAL GESTÃO */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#161b22] p-8 rounded border border-[#30363d] w-full max-w-lg shadow-2xl">
              <h2 className="text-emerald-500 font-black italic mb-8 border-b border-[#30363d] pb-2 uppercase tracking-widest text-lg text-left">Entrada Técnica de Jazida</h2>
              <div className="space-y-4 text-left">
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1">ATRIBUIR RESPONSÁVEL (ENG/GEO) *</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase font-bold outline-none focus:border-emerald-500" value={atribuidoPara} onChange={e => setAtribuidoPara(e.target.value)}><option value="">SELECIONE UM PROFISSIONAL</option>{equipe.map(tec => (<option key={tec.id} value={tec.id}>{tec.nome_completo} ({tec.cargo})</option>))}</select></div>
                 <div className="grid grid-cols-2 gap-3"><div><label className="text-[8px] font-black text-slate-500 block mb-1">PROCESSO ANM *</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={numProcesso} onChange={e => setNumProcesso(e.target.value)} /></div><div><label className="text-[8px] font-black text-slate-500 block mb-1">CLIENTE</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white uppercase" value={cliente} onChange={e => setCliente(e.target.value)} /></div></div>
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1">TÍTULO DA DEMANDA *</label><input className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white font-bold uppercase" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3"><div><label className="text-[8px] font-black text-slate-500 block mb-1">VENCIMENTO</label><input type="date" className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={vencimento} onChange={e => setVencimento(e.target.value)} /></div><div><label className="text-[8px] font-black text-slate-500 block mb-1">PRIORIDADE</label><select className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white" value={ranking} onChange={e => setRanking(e.target.value)}><option value="2">NORMAL</option><option value="3">URGENTE</option><option value="4">CRÍTICA</option></select></div></div>
                 <div><label className="text-[8px] font-black text-slate-500 block mb-1">NOTAS TÉCNICAS</label><textarea className="w-full bg-[#0d1117] border border-[#30363d] p-3 text-xs text-white h-24 uppercase" value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} /></div>
              </div>
              <div className="flex gap-4 mt-10"><button onClick={handleSalvar} className="flex-1 bg-emerald-600 p-4 font-black uppercase text-xs text-black shadow-lg hover:bg-emerald-500 transition-all">SALVAR DADOS</button><button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-800 p-4 font-black uppercase text-xs text-slate-400">FECHAR</button></div>
            </div>
          </div>
        )}

        {/* ONBOARDING */}
        {isFirstLogin && (
          <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <div className="bg-[#161b22] p-10 rounded border border-emerald-500/30 w-full max-w-md shadow-2xl text-center">
              <h2 className="text-2xl font-black mb-2 text-emerald-500 uppercase italic tracking-tighter">Bem-vindo à Ecominas</h2>
              <p className="text-slate-500 text-[10px] mb-8 uppercase font-bold tracking-widest">Configure seu perfil para acessar o sistema</p>
              <div className="space-y-4 text-left">
                <div><label className="block text-[10px] font-black text-slate-500 uppercase mb-2">Nome Completo</label><input className="w-full p-4 rounded bg-[#0d1117] border border-[#30363d] text-white uppercase font-bold" value={nomeOnboarding} onChange={(e) => setNomeOnboarding(e.target.value)} /></div>
              </div>
              <button onClick={handleCriarPerfil} className="w-full mt-10 bg-emerald-600 hover:bg-emerald-500 p-5 rounded font-black uppercase text-xs tracking-widest shadow-lg transition-all">Ativar Painel Operacional</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}