'use client'

import { useState } from 'react'
import { Download, Eye, Printer, Share2, ChevronDown } from 'lucide-react'
import type { DadosOrcamento, ConfigPDF } from '@/lib/pdf/utils'

interface Props {
  dados: DadosOrcamento
  config: ConfigPDF
}

export function BotoesPDF({ dados, config }: Props) {
  const [modelo, setModelo] = useState<'comercial' | 'premium'>('comercial')
  const [gerando, setGerando] = useState(false)
  const [showModelos, setShowModelos] = useState(false)

  async function gerarPDF(acao: 'baixar' | 'imprimir' | 'compartilhar') {
    setGerando(true)
    try {
      let gerar: ((d: DadosOrcamento, c: ConfigPDF) => void)

      if (modelo === 'premium') {
        const { gerarPdfPremium } = await import('@/lib/pdf/gerarPdfPremium')
        gerar = gerarPdfPremium
      } else {
        const { gerarPdfComercial } = await import('@/lib/pdf/gerarPdfComercial')
        gerar = gerarPdfComercial
      }

      if (acao === 'compartilhar' && typeof navigator.share !== 'undefined') {
        // Gerar blob para compartilhar
        const { default: jsPDF } = await import('jspdf')
        // Por simplicidade, compartilhar abre o download
        gerar(dados, config)
      } else if (acao === 'imprimir') {
        // Gera e depois abre janela de impressão
        gerar(dados, config)
        setTimeout(() => window.print(), 800)
      } else {
        gerar(dados, config)
      }
    } catch (e) {
      console.error('Erro ao gerar PDF:', e)
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Seletor de modelo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowModelos(!showModelos)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm"
        >
          <div>
            <p className="font-semibold text-gray-800">Modelo do PDF</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {modelo === 'comercial'
                ? '📄 Comercial — compacto, ideal para WhatsApp'
                : '✨ Premium — elegante, ideal para casamentos'}
            </p>
          </div>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${showModelos ? 'rotate-180' : ''}`} />
        </button>

        {showModelos && (
          <div className="border-t border-gray-100">
            <button
              onClick={() => { setModelo('comercial'); setShowModelos(false) }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${modelo === 'comercial' ? 'bg-pink-50' : ''}`}
            >
              <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                📄 Modelo Comercial
                {modelo === 'comercial' && <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">Selecionado</span>}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Objetivo, 1 página, ideal para envio rápido pelo WhatsApp</p>
            </button>
            <button
              onClick={() => { setModelo('premium'); setShowModelos(false) }}
              className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-100 ${modelo === 'premium' ? 'bg-pink-50' : ''}`}
            >
              <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                ✨ Modelo Premium
                {modelo === 'premium' && <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full font-semibold">Selecionado</span>}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">Sofisticado, multi-página, ideal para casamentos e eventos premium</p>
            </button>
          </div>
        )}
      </div>

      {/* Botões de ação */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => gerarPDF('baixar')}
          disabled={gerando}
          className="flex items-center justify-center gap-2 bg-[#b5005e] text-white rounded-xl py-3 text-sm font-semibold shadow-sm disabled:opacity-60 active:scale-95 transition-transform"
        >
          <Download size={16} />
          {gerando ? 'Gerando...' : 'Baixar PDF'}
        </button>

        <button
          onClick={() => window.open(`/eventos/orcamentos/${dados.numero}/imprimir`, '_blank')}
          className="flex items-center justify-center gap-2 bg-white border-2 border-[#b5005e] text-[#b5005e] rounded-xl py-3 text-sm font-semibold active:scale-95 transition-transform"
        >
          <Eye size={16} />
          Visualizar
        </button>

        <button
          onClick={() => gerarPDF('imprimir')}
          disabled={gerando}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
        >
          <Printer size={16} />
          Imprimir
        </button>

        <button
          onClick={() => gerarPDF('compartilhar')}
          disabled={gerando}
          className="flex items-center justify-center gap-2 bg-green-500 text-white rounded-xl py-3 text-sm font-medium active:scale-95 transition-transform"
        >
          <Share2 size={16} />
          Compartilhar
        </button>
      </div>
    </div>
  )
}
