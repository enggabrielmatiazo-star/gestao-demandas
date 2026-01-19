'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Força o redirecionamento imediato para a tela de login
    router.push('/login')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-[#0a0f0d]">
      <p className="text-emerald-500 font-black animate-pulse uppercase tracking-widest text-xs">
        Carregando Portal Ecominas...
      </p>
    </div>
  )
}