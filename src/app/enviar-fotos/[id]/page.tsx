'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { ImagePlus, CheckCircle2, Loader2, X, AlertCircle } from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface FotoStatus {
  file: File
  preview: string
  status: 'aguardando' | 'enviando' | 'ok' | 'erro'
  progresso: number
}

export default function EnviarFotosPage({ params }: { params: { id: string } }) {
  const pedidoId = params.id
  const [pedido, setPedido] = useState<any>(null)
  const [fotos, setFotos] = useState<FotoStatus[]>([])
  const [enviando, setEnviando] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [erro, setErro] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch(`/api/pedido/info/${pedidoId}`)
      .then(r => r.json())
      .then(d => { if (!d.error) setPedido(d) })
      .catch(() => {})
  }, [pedidoId])

  function selecionarFotos(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(e.target.files || [])
    const novas: FotoStatus[] = arquivos.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      status: 'aguardando',
      progresso: 0,
    }))
    setFotos(prev => [...prev, ...novas])
  }

  function removerFoto(idx: number) {
    setFotos(prev => prev.filter((_, i) => i !== idx))
  }

  async function enviarFotos() {
    if (fotos.length === 0) return
    setEnviando(true)
    setErro('')

    let todasOk = true

    for (let i = 0; i < fotos.length; i++) {
      const foto = fotos[i]
      if (foto.status === 'ok') continue

      setFotos(prev => prev.map((f, idx) =>
        idx === i ? { ...f, status: 'enviando' } : f
      ))

      try {
        // 1. Pede URL assinada ao servidor
        const res = await fetch('/api/fotos/signed-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pedidoId, fileName: foto.file.name }),
        })
        const json = await res.json()

        if (json.error || !json.token) throw new Error(json.error || 'Erro ao gerar URL de upload')

        // 2. Faz upload direto para o Storage usando a URL assinada
        const { error: uploadError } = await supabase.storage
          .from('fotos-clientes')
          .uploadToSignedUrl(json.path, json.token, foto.file)

        if (uploadError) throw new Error(uploadError.message)

        setFotos(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'ok', progresso: 100 } : f
        ))
      } catch (e: any) {
        console.error('Erro upload foto:', e?.message)
        setFotos(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'erro' } : f
        ))
        setErro(e?.message || 'Erro desconhecido')
        todasOk = false
      }
    }

    setEnviando(false)
    if (todasOk) {
      setConcluido(true)
    } else {
      setErro('Algumas fotos não foram enviadas. Tente novamente.')
    }
  }

  if (concluido) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle2 size={40} className="text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Fotos enviadas!</h1>
        <p className="text-gray-500 mb-1">
          Recebemos {fotos.filter(f => f.status === 'ok').length} foto{fotos.filter(f => f.status === 'ok').length !== 1 ? 's' : ''} com sucesso.
        </p>
        <p className="text-gray-500">Assim que finalizarmos seu pedido, entraremos em contato. 💚</p>
        <div className="mt-8 bg-green-600 text-white rounded-2xl px-6 py-4 text-sm font-medium">
          Reviva — Ímãs de Foto
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-600 px-5 pt-10 pb-6 text-white">
        <p className="text-green-200 text-xs font-medium uppercase tracking-wider mb-1">Reviva — Ímãs de Foto</p>
        <h1 className="text-xl font-bold">Enviar suas fotos</h1>
        {pedido && (
          <p className="text-green-200 text-sm mt-1">
            Pedido #{pedido.numero} · {pedido.nomeCliente}
          </p>
        )}
      </div>

      <div className="p-5">
        {/* Instrução */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-sm text-gray-700 font-medium mb-1">Como funciona:</p>
          <p className="text-sm text-gray-500">
            Selecione as fotos que deseja usar nos ímãs. Recomendamos fotos com boa iluminação e resolução.
          </p>
        </div>

        {/* Área de seleção */}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-green-300 rounded-2xl p-6 flex flex-col items-center gap-3 bg-green-50 active:bg-green-100 transition-all mb-4"
        >
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <ImagePlus size={24} className="text-green-600" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-green-700">Toque para escolher fotos</p>
            <p className="text-xs text-gray-400 mt-0.5">JPG, PNG ou HEIC · até 50MB por foto</p>
          </div>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={selecionarFotos}
        />

        {/* Grid de fotos selecionadas */}
        {fotos.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {fotos.map((foto, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={foto.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  {/* Status overlay */}
                  {foto.status === 'enviando' && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={20} className="text-white animate-spin" />
                    </div>
                  )}
                  {foto.status === 'ok' && (
                    <div className="absolute inset-0 bg-green-600/40 flex items-center justify-center">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                  )}
                  {foto.status === 'erro' && (
                    <div className="absolute inset-0 bg-red-500/40 flex items-center justify-center">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                  )}
                  {/* Botão remover */}
                  {foto.status === 'aguardando' && (
                    <button
                      onClick={() => removerFoto(idx)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 text-center mb-4">
              {fotos.length} foto{fotos.length !== 1 ? 's' : ''} selecionada{fotos.length !== 1 ? 's' : ''}
            </p>
          </>
        )}

        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{erro}</p>
          </div>
        )}

        {/* Botão enviar */}
        <button
          onClick={enviarFotos}
          disabled={fotos.length === 0 || enviando}
          className="w-full bg-green-600 text-white py-4 rounded-xl font-semibold text-base disabled:opacity-40 active:scale-95 transition-all"
        >
          {enviando
            ? `Enviando... ${fotos.filter(f => f.status === 'ok').length}/${fotos.length}`
            : `Enviar ${fotos.length > 0 ? fotos.length + ' foto' + (fotos.length !== 1 ? 's' : '') : 'fotos'}`
          }
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          Suas fotos são enviadas de forma segura e privada 🔒
        </p>
      </div>
    </div>
  )
}
