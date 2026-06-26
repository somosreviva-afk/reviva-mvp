'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Leaf, Mail, CheckCircle } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [etapa, setEtapa] = useState<'email' | 'enviado'>('email')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  async function enviarLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setErro('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      if (error.message?.includes('rate limit')) {
        setErro('Muitas tentativas. Aguarde alguns minutos e tente novamente.')
      } else {
        setErro('Erro ao enviar o link. Verifique o email e tente novamente.')
      }
      setLoading(false)
      return
    }

    setEtapa('enviado')
    setLoading(false)
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
          <form onSubmit={enviarLink} className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Mail size={16} className="text-green-600" />
                <p className="text-sm font-semibold text-gray-700">Acesso seguro</p>
              </div>
              <p className="text-xs text-gray-500">
                Vamos enviar um link de acesso para o seu email. Só você consegue entrar.
              </p>
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
              {loading ? 'Enviando...' : 'Enviar link de acesso'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="bg-green-50 rounded-2xl border border-green-100 p-6 text-center">
              <CheckCircle size={40} className="text-green-600 mx-auto mb-3" />
              <p className="text-sm font-semibold text-green-700 mb-1">Link enviado!</p>
              <p className="text-xs text-green-700">
                Verifique o email <strong>{email}</strong> e clique em{' '}
                <strong>"Sign in"</strong> para entrar no sistema.
              </p>
              <p className="text-xs text-gray-400 mt-3">O link expira em 10 minutos.</p>
            </div>

            <button
              type="button"
              onClick={() => { setEtapa('email'); setErro('') }}
              className="w-full text-sm text-gray-500 py-2"
            >
              Usar outro email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
