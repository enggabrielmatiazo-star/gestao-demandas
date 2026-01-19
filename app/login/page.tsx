'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [cargo, setCargo] = useState('Engenheiro') 
  const [isRegistering, setIsRegistering] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin() {
  // Validação simples para evitar o erro "missing email"
  if (!email || !password) {
    return alert('Por favor, preencha o e-mail e a senha.');
  }

  setLoading(true);
  
  const { error } = await supabase.auth.signInWithPassword({ 
    email: email.trim(), // Remove espaços acidentais
    password: password 
  });
  
  if (!error) {
    router.push('/dashboard');
  } else {
    alert('Erro ao acessar: ' + error.message);
  }
  setLoading(false);
}

  async function handleCadastro() {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { cargo_inicial: cargo },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      }
    })
    
    if (!error) {
      alert('Conta criada com sucesso! Verifique seu e-mail ou entre agora.')
      setIsRegistering(false)
    } else {
      alert('Erro ao cadastrar: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0f0d] text-white font-sans p-4">
      <div className="w-full max-w-md rounded-[2.5rem] border border-emerald-900/20 bg-[#111a16] p-10 shadow-2xl">
        
        {/* Cabeçalho com Identidade Visual */}
        <div className="mb-8 text-center">
          <div className="bg-white p-4 rounded-3xl inline-block shadow-lg mb-6">
            <img src="/logo-ecominas.png" alt="Ecominas" className="h-12 w-auto object-contain" />
          </div>
          <h1 className="text-2xl font-black text-emerald-500 uppercase italic tracking-tighter">
            {isRegistering ? 'Criar Nova Conta' : 'ECOMINAS'}
          </h1>
          <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-widest">
            {isRegistering ? 'Cadastre-se na Consultoria' : 'Acompanhe suas demandas'}
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-[10px] font-black text-emerald-900 uppercase tracking-widest">E-mail Corporativo</label>
            <input 
              type="email" 
              placeholder="seuemail@gmail.com"
              className="w-full rounded-2xl border border-emerald-900/20 bg-[#0a0f0d] p-4 outline-none focus:border-emerald-500 transition-all text-white font-medium" 
              onChange={(e) => setEmail(e.target.value)} 
            />
          </div>
          
          <div>
            <label className="block mb-2 text-[10px] font-black text-emerald-900 uppercase tracking-widest">Senha de Acesso</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full rounded-2xl border border-emerald-900/20 bg-[#0a0f0d] p-4 outline-none focus:border-emerald-500 transition-all text-white font-medium" 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {/* Seletor de Cargo visível apenas no Cadastro */}
          {isRegistering && (
            <div>
              <label className="block mb-2 text-[10px] font-black text-emerald-900 uppercase tracking-widest">Cargo na Consultoria</label>
              <select 
                className="w-full rounded-2xl border border-emerald-900/20 bg-[#0a0f0d] p-4 outline-none focus:border-emerald-500 text-white font-bold appearance-none cursor-pointer"
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
              >
                <option value="Diretor">Diretor</option>
                <option value="Coordenador">Coordenador</option>
                <option value="Engenheiro">Engenheiro</option>
                <option value="Geólogo">Geólogo</option>
              </select>
            </div>
          )}
          
          <button 
            onClick={isRegistering ? handleCadastro : handleLogin} 
            disabled={loading} 
            className="w-full rounded-2xl bg-emerald-600 p-4 font-black text-xs uppercase transition-all hover:bg-emerald-500 active:scale-95 border-b-4 border-emerald-800 shadow-lg shadow-emerald-950/50"
          >
            {loading ? 'Processando...' : isRegistering ? 'Finalizar Cadastro' : 'Entrar no Sistema'}
          </button>

          <div className="pt-4 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-bold text-slate-500 hover:text-emerald-400 uppercase tracking-widest transition-colors">
              {isRegistering ? 'Já possui uma conta? Faça Login' : 'Novo na equipe? Crie sua conta aqui'}
            </button>
          </div>
        </div>

        {/* Rodapé Ecominas Solicitado */}
        <div className="mt-12 text-center">
          <p className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em]">
            Ecominas Mineração © 2015
          </p>
        </div>
      </div>
    </div>
  )
}