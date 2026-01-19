'use client'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Dashboard() {
  const router = useRouter()
  
  // Estados de Identidade
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('Carregando...')
  const [userCargo, setUserCargo] = useState('') // Controle de permissão

  // Estados do Sistema
  const [demandas, setDemandas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cargoOnboarding, setCargoOnboarding] = useState('Engenheiro')

  // Estados do Formulário de Demandas (image_2fc8ed.png)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [numProcesso, setNumProcesso] = useState('') 
  const [cliente, setCliente] = useState('')
  const [novoTitulo, setNovoTitulo] = useState('')   
  const [vencimento, setVencimento] = useState('')
  const [linkProjeto, setLinkProjeto] = useState('')
  const [ranking, setRanking] = useState('3')         
  const [novaDescricao, setNovaDescricao] = useState('')

  async function carregarDemandas() {
    setLoading(true)
    const { data, error } = await supabase.from('demandas').select('*').order('vencimento', { ascending: true })
    if (!error && data) setDemandas(data)
    setLoading(false)
  }

  useEffect(() => {
    async function inicializar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return; }
      setUserId(user.id)

      const { data: perfil, error } = await supabase.from('perfis').select('nome_completo, cargo').eq('id', user.id).single()

      if (!perfil || error) {
        setIsFirstLogin(true)
        // Se houver cargo salvo no metadata do cadastro, preenchemos o padrão
        if (user.user_metadata?.cargo_inicial) setCargoOnboarding(user.user_metadata.cargo_inicial)
      } else {
        setUserName(perfil.nome_completo)
        setUserCargo(perfil.cargo)
      }
      carregarDemandas()
    }
    inicializar()
  }, [router])

  async function handleCriarPerfil() {
    if (!nomeCompleto) return alert('Por favor, digite seu nome completo.')
    const { error } = await supabase.from('perfis').insert([{ id: userId, nome_completo: nomeCompleto, cargo: cargoOnboarding, empresa: 'Ecominas Mineração' }])
    if (!error) {
      setUserName(nomeCompleto)
      setUserCargo(cargoOnboarding)
      setIsFirstLogin(false)
    } else alert('Erro ao criar perfil: ' + error.message)
  }

  async function handleSalvarDemanda() {
    if (!numProcesso || !novoTitulo) return alert('N° do Processo e Título são obrigatórios!')
    const { error } = await supabase.from('demandas').insert([{ 
      num_processo: numProcesso, cliente, titulo: novoTitulo, vencimento: vencimento || null, 
      link_projeto: linkProjeto, ranking: parseInt(ranking), descricao: novaDescricao, 
      status: 'Aberta', criado_por_id: userId 
    }])
    if (!error) {
      setIsModalOpen(false)
      setNumProcesso(''); setCliente(''); setNovoTitulo(''); setVencimento(''); setLinkProjeto(''); setRanking('3'); setNovaDescricao('')
      carregarDemandas()
    }
  }

  // Lógica dos Contadores
  const hoje = new Date().toISOString().split('T')[0]
  const tarefasEmAberto = demandas.filter(d => d.status !== 'Concluído').length
  const tarefasConcluidas = demandas.filter(d => d.status === 'Concluído').length
  const tarefasAtrasadas = demandas.filter(d => d.status !== 'Concluído' && d.vencimento && d.vencimento < hoje).length

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Cabeçalho com Trava de Cargo */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-emerald-900/30 pb-8 gap-6">
          <div className="flex items-center gap-6">
            <div className="bg-white p-3 rounded-2xl shadow-xl">
              <img src="/logo-ecominas.png" alt="Ecominas" className="h-12 w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black text-emerald-500 uppercase italic">Ecominas Dashboard</h1>
              <p className="text-slate-500 text-sm font-bold tracking-tight">Responsável: <span className="text-emerald-400">{userName}</span> ({userCargo})</p>
            </div>
          </div>
          
          {/* BOTÃO CONDICIONAL: Somente Diretor ou Coordenador */}
          {(userCargo === 'Diretor' || userCargo === 'Coordenador') && (
            <button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-500 px-8 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-lg active:scale-95 border-b-4 border-emerald-800"
            >
              + Adicionar Demanda
            </button>
          )}
        </div>

        {/* Modal de Primeiro Acesso (Onboarding) */}
        {isFirstLogin && (
          <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-[100] backdrop-blur-md">
            <div className="bg-[#111a16] p-10 rounded-[3rem] border border-emerald-500/30 w-full max-w-md shadow-2xl text-center">
              <h2 className="text-2xl font-black mb-2 text-emerald-500 uppercase italic">Bem-vindo à Ecominas!</h2>
              <div className="space-y-4 text-left mt-8">
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2">Nome Completo</label>
                  <input className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-white" value={nomeCompleto} onChange={(e) => setNomeCompleto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2">Confirmar Cargo</label>
                  <select className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-white font-bold" value={cargoOnboarding} onChange={(e) => setCargoOnboarding(e.target.value)}>
                    <option value="Diretor">Diretor</option>
                    <option value="Coordenador">Coordenador</option>
                    <option value="Engenheiro">Engenheiro</option>
                    <option value="Geólogo">Geólogo</option>
                  </select>
                </div>
              </div>
              <button onClick={handleCriarPerfil} className="w-full mt-10 bg-emerald-600 p-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Acessar Sistema</button>
            </div>
          </div>
        )}

        {/* Grade de Contadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-emerald-900/20 text-emerald-500">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Em Aberto</h3>
            <p className="text-5xl font-black mt-2">{tarefasEmAberto}</p>
          </div>
          <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-emerald-900/20 text-blue-500">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Concluídas</h3>
            <p className="text-5xl font-black mt-2">{tarefasConcluidas}</p>
          </div>
          <div className="bg-slate-900/40 p-8 rounded-[2rem] border border-red-900/20 text-red-600">
            <h3 className="text-red-900/60 text-[10px] font-black uppercase tracking-widest">Atrasadas</h3>
            <p className="text-5xl font-black mt-2">{tarefasAtrasadas}</p>
          </div>
        </div>

        {/* Modal de Demanda (Somente para Diretor/Coordenador) */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
            <div className="bg-[#111a16] p-8 rounded-[2.5rem] border border-emerald-900/30 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-2xl font-black mb-8 text-emerald-500 uppercase tracking-tighter italic">Nova Demanda Técnica</h2>
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Processo *</label>
                    <input className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-white" placeholder="850..." value={numProcesso} onChange={(e) => setNumProcesso(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Cliente</label>
                    <input className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-white" value={cliente} onChange={(e) => setCliente(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Título da Demanda *</label>
                  <input className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-white font-medium" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Vencimento</label>
                    <input type="date" className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-slate-400 font-bold" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Prioridade</label>
                    <select className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-white font-bold" value={ranking} onChange={(e) => setRanking(e.target.value)}>
                      <option value="1">1 - Baixa</option>
                      <option value="2">2 - Média</option>
                      <option value="3">3 - Prioridade</option>
                      <option value="4">4 - Crítica</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Link do Processo</label>
                  <input className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 text-emerald-500 underline text-xs" value={linkProjeto} onChange={(e) => setLinkProjeto(e.target.value)} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-900 uppercase mb-2 tracking-widest">Notas Técnicas</label>
                  <textarea className="w-full p-4 rounded-xl bg-[#0a0f0d] border border-emerald-900/20 h-24 text-white font-medium" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button onClick={handleSalvarDemanda} className="flex-1 bg-emerald-600 p-4 rounded-2xl font-black uppercase text-xs shadow-lg active:scale-95 transition-all">Salvar Dados</button>
                <button onClick={() => setIsModalOpen(false)} className="flex-1 bg-slate-900 p-4 rounded-2xl font-black uppercase text-xs border border-slate-800 transition-all hover:bg-slate-800">Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* Listagem Profissional */}
        <div className="bg-[#0d1411] rounded-[2.5rem] border border-emerald-900/10 p-8 shadow-2xl">
          <h2 className="text-sm font-black text-slate-600 uppercase tracking-[0.2em] mb-8 italic">Gestão de Processos Ecominas</h2>
          <div className="space-y-4">
            {loading ? (
              <p className="text-center py-10 text-emerald-900 animate-pulse font-black uppercase text-[10px]">Consultando Jazidas...</p>
            ) : demandas.length === 0 ? (
              <div className="text-center py-20 text-slate-700 font-bold italic border-2 border-dashed border-emerald-900/5 rounded-3xl">Nenhum processo minerário registrado.</div>
            ) : (
              demandas.map((item) => {
                const isAtrasada = item.vencimento && item.vencimento < hoje && item.status !== 'Concluído';
                return (
                  <div key={item.id} className="group bg-[#111a16] hover:bg-[#16221d] p-6 rounded-3xl border border-emerald-900/5 transition-all duration-300 shadow-md">
                    <div className="flex flex-col md:flex-row justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-[9px] font-black px-2 py-1 bg-emerald-900/30 text-emerald-500 rounded border border-emerald-500/10 tracking-widest uppercase italic">PROC: {item.num_processo}</span>
                          {isAtrasada && <span className="text-[9px] font-black px-2 py-1 bg-red-900/20 text-red-500 rounded border border-red-500/10 animate-pulse tracking-widest uppercase font-bold">ATRASADO</span>}
                        </div>
                        <h3 className="text-lg font-bold text-slate-200 uppercase tracking-tight group-hover:text-emerald-400">
                          {item.titulo} <span className="text-slate-600 font-medium ml-2 text-sm italic">| {item.cliente}</span>
                        </h3>
                        {item.vencimento && (
                          <p className={`text-[10px] mt-2 font-black ${isAtrasada ? 'text-red-500' : 'text-slate-500'} tracking-wider`}>
                            VENCIMENTO: {new Date(item.vencimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className={`text-[10px] font-black px-6 py-2 rounded-full border transition-all ${
                          item.status === 'Concluído' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-[#0a0f0d] text-slate-500 border-slate-800'
                        } tracking-widest uppercase`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}