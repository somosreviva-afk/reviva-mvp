'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, KeyRound } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [etapa, setEtapa] = useState<'email' | 'codigo'>('email')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function enviarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }, // só aceita emails já cadastrados
    })

    if (error) {
      setErro('Email não encontrado ou erro ao enviar. Verifique e tente novamente.')
      setLoading(false)
      return
    }

    setEtapa('codigo')
    setLoading(false)
  }

  async function verificarCodigo(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: codigo,
      type: 'email',
    })

    if (error) {
      setErro('Código incorreto ou expirado. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600 rounded-2xl mb-4">
            <Leaf className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reviva</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de gestão</p>
        </div>

        {etapa === 'email' ? (
          <form onSubmit={enviarCodigo} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={16} className="text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Acesso seguro</p>
              </div>
              <p className="text-xs text-gray-500">Vamos enviar um código de 6 dígitos para o seu email. O código expira em 10 minutos.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                placeholder="seu@email.com"
                required
                autoComplete="email"
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold text-base active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Enviando...' : 'Enviar código'}
            </button>
          </form>
        ) : (
          <form onSubmit={verificarCodigo} className="space-y-4">
            <div className="bg-green-50 rounded-2xl border border-green-100 p-4 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <KeyRound size={16} className="text-green-600" />
                <p className="text-sm font-semibold text-green-700">Código enviado!</p>
              </div>
              <p className="text-xs text-green-700">Verifique o email <strong>{email}</strong> e digite o código de 6 dígitos abaixo.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Código de verificação</label>
              <input
                type="text"
                inputMode="numeric"
                value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-2xl font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                placeholder="000000"
                required
                autoComplete="one-time-code"
                maxLength={6}
              />
            </div>

            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600 text-sm">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || codigo.length < 6}
              className="w-full bg-green-600 text-white py-3.5 rounded-xl font-semibold text-base active:scale-95 transition-all disabled:opacity-60"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>

            <button
              type="button"
              onClick={() => { setEtapa('email'); setCodigo(''); setErro('') }}
              className="w-full text-sm text-gray-500 py-2"
            >
              Usar outro email
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
