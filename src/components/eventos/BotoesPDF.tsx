'use client'

import { useState } from 'react'
import { Download, Eye, Printer, Share2 } from 'lucide-react'

export type DadosPDF = {
  id?: string
  numero: string
  nome_cliente?: string
  telefone_cliente?: string
  email_cliente?: string
  tipo_evento?: string
  data_evento?: string
  local_evento?: string
  cidade?: string
  qtd_convidados?: number
  qtd_fotoimagas?: number
  horas_evento?: number
  valor_final?: number
  valor_sugerido?: number
  sinal_percentual?: number
  custo_fotoimagas?: number
  custo_auxiliar?: number
  custo_combustivel?: number
  custo_pedagio?: number
  custo_alimentacao?: number
  custo_hospedagem?: number
  custo_embalagem?: number
  custo_outros?: number
  custo_total?: number
  margem_lucro?: number
  validade_dias?: number
  observacoes?: string
  itens_extras?: string
  criado_em?: string
}

interface Props {
  dados: DadosPDF
  config: Record<string, string>
}

function fmt(v: number) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

function fmtData(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function nomeArq(dados: DadosPDF) {
  const c = dados.nome_cliente || 'Cliente'
  const d = dados.data_evento
    ? new Date(dados.data_evento + 'T00:00:00').toLocaleDateString('pt-BR').replace(/\//g, '-')
    : 'Sem-data'
  return `Orçamento - ${c} - ${d}.pdf`
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16) || 181, parseInt(h.slice(2, 4), 16) || 0, parseInt(h.slice(4, 6), 16) || 94]
}

async function gerarPDF(dados: DadosPDF, config: Record<string, string>, modelo: 'comercial' | 'premium') {
  // Import jsPDF dinamicamente para garantir que está no browser
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const mg = 15
  const cor = config.cor_primaria || '#b5005e'
  const [cr, cg, cb] = hexRgb(cor)

  const valorFinal = Number(dados.valor_final || dados.valor_sugerido || 0)
  const sinalPct = Number(dados.sinal_percentual || 50)
  const sinal = valorFinal * (sinalPct / 100)
  const restante = valorFinal - sinal

  function logo(x: number, y: number, w: number, h: number) {
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(x, y, w, h, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(h * 0.42)
    doc.text('R E V I V A', x + w / 2, y + h * 0.52, { align: 'center' })
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.2)
    doc.line(x + w * 0.15, y + h * 0.66, x + w * 0.85, y + h * 0.66)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(Math.max(5, h * 0.16))
    doc.text('SUAS MEMÓRIAS, SEMPRE POR PERTO', x + w / 2, y + h * 0.83, { align: 'center' })
  }

  function secao(texto: string, x: number, y: number) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(cr, cg, cb)
    doc.text(texto, x, y)
    doc.setDrawColor(cr, cg, cb)
    doc.setLineWidth(0.2)
    doc.line(x, y + 1.5, pw - mg, y + 1.5)
    doc.setDrawColor(200, 200, 200)
  }

  function campo(label: string, valor: string, x: number, y: number) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(140, 140, 140)
    doc.text(label.toUpperCase(), x, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(valor || '—', x, y + 4)
  }

  function bullet(texto: string, x: number, y: number) {
    doc.setFillColor(cr, cg, cb)
    doc.circle(x + 1, y - 1, 0.8, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(40, 40, 40)
    const linhas = doc.splitTextToSize(texto, pw - mg - x - 6)
    linhas.forEach((l: string, i: number) => doc.text(l, x + 4, y + i * 4.5))
    return y + linhas.length * 4.5
  }

  function rodape() {
    const ry = ph - 20
    doc.setFillColor(cr, cg, cb)
    doc.rect(0, ry, pw, 20, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(config.nome_empresa || 'Reviva Imãs', pw / 2, ry + 6, { align: 'center' })
    const contatos = [
      config.instagram_orcamento || config.instagram_empresa ? `📸 ${config.instagram_orcamento || config.instagram_empresa}` : '',
      config.telefone_empresa ? `📱 ${config.telefone_empresa}` : '',
    ].filter(Boolean).join('     ')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(255, 210, 238)
    doc.text(contatos, pw / 2, ry + 12, { align: 'center' })
    doc.setFontSize(7)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(255, 190, 228)
    doc.text(config.mensagem_rodape || 'Obrigada por considerar a Reviva para fazer parte desse momento tão especial.', pw / 2, ry + 18, { align: 'center' })
  }

  if (modelo === 'comercial') {
    // ── MODELO COMERCIAL (1 página compacta) ──────────────────────────────
    let y = mg

    logo(mg, y, 62, 22, )
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(cr, cg, cb)
    doc.text('ORÇAMENTO', pw - mg, y + 8, { align: 'right' })
    doc.setFontSize(10)
    doc.setTextColor(30, 30, 30)
    doc.text(dados.numero, pw - mg, y + 14, { align: 'right' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(130, 130, 130)
    doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pw - mg, y + 20, { align: 'right' })
    y += 30

    doc.setDrawColor(cr, cg, cb)
    doc.setLineWidth(0.5)
    doc.line(mg, y, pw - mg, y)
    y += 7

    // Dados 2 colunas
    const c1 = mg, c2 = pw / 2 + 3
    secao('DADOS DO CLIENTE', c1, y)
    secao('DADOS DO EVENTO', c2, y)
    y += 6

    const baseY = y
    let y1 = baseY
    ;[['Nome', dados.nome_cliente || ''], ['Telefone', dados.telefone_cliente || ''], ['E-mail', dados.email_cliente || '']].forEach(([l, v]) => {
      campo(l, v, c1, y1); y1 += 10
    })
    let y2 = baseY
    ;[['Tipo de evento', dados.tipo_evento || ''], ['Data', fmtData(dados.data_evento)], ['Cidade', dados.cidade || dados.local_evento || ''], ['Convidados', dados.qtd_convidados ? `${dados.qtd_convidados} pessoas` : '']].forEach(([l, v]) => {
      campo(l, v, c2, y2); y2 += 10
    })
    y = Math.max(y1, y2) + 5

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(mg, y, pw - mg, y)
    y += 7

    // O que está incluso
    secao('O QUE ESTÁ INCLUSO', mg, y)
    y += 5
    const itensPadrao = (config.itens_inclusos || 'Equipe durante todo o evento|Impressão dos fotoímãs em alta qualidade|Produção ao vivo|Estrutura completa|Atendimento personalizado|Lembrança exclusiva para os convidados|Organização completa durante o evento').split('|')
    const itensExtras = dados.itens_extras ? dados.itens_extras.split('|') : []
    const itens = [...itensPadrao, ...itensExtras]
    const mid = Math.ceil(itens.length / 2)
    let yi1 = y, yi2 = y
    itens.slice(0, mid).forEach(item => { yi1 = bullet(item.trim(), c1, yi1) + 1 })
    itens.slice(mid).forEach(item => { yi2 = bullet(item.trim(), c2, yi2) + 1 })
    y = Math.max(yi1, yi2) + 5

    doc.setDrawColor(220, 220, 220)
    doc.setLineWidth(0.3)
    doc.line(mg, y, pw - mg, y)
    y += 7

    // Investimento
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y, pw - mg * 2, 40, 3, 3, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text('INVESTIMENTO', mg + 6, y + 8)
    doc.setFontSize(22)
    doc.text(`R$ ${fmt(valorFinal)}`, mg + 6, y + 20)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(255, 210, 238)
    doc.text(`Entrada (${sinalPct}%): R$ ${fmt(sinal)}`, mg + 6, y + 28)
    doc.text(`Saldo: R$ ${fmt(restante)}`, mg + 6, y + 34)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(255, 255, 255)
    doc.text('FORMA DE PAGAMENTO', c2, y + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(255, 230, 245)
    doc.text('✓  PIX', c2, y + 15)
    doc.text('✓  Cartão de Crédito (+ taxas)', c2, y + 21)
    if (config.pix_empresa) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text(`PIX: ${config.pix_empresa}`, c2, y + 29)
    }
    y += 48

    // Condições
    secao('CONDIÇÕES DE PAGAMENTO', mg, y)
    y += 5
    const conds = (config.condicoes_pagamento || 'Entrada de 50% para reserva da data.|Saldo restante até uma semana antes do evento.|Pagamento via PIX.|Pagamento via Cartão de Crédito (com acréscimo das taxas da operadora).').split('|')
    conds.filter(c => c.trim()).forEach(c => { y = bullet(c.trim(), mg, y) + 1.5 })
    y += 4

    // Obs
    secao('OBSERVAÇÕES', mg, y)
    y += 5
    const validade = dados.validade_dias || 7
    const obsList = [`O orçamento é válido por ${validade} dias.`, 'A reserva da data será confirmada somente após o pagamento da entrada.', ...(dados.observacoes ? [dados.observacoes] : [])]
    obsList.forEach(o => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(50, 50, 50)
      const ls = doc.splitTextToSize(`• ${o}`, pw - mg * 2)
      ls.forEach((l: string) => { doc.text(l, mg, y); y += 4.5 })
    })

    rodape()

  } else {
    // ── MODELO PREMIUM (elegante, multi-página) ────────────────────────────
    // PÁGINA 1: capa
    doc.setFillColor(cr, cg, cb)
    doc.rect(0, 0, pw, 72, 'F')

    // Arcos decorativos
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.4)
    for (let i = 0; i < 3; i++) {
      doc.ellipse(pw + 5 - i * 8, 5 + i * 3, 20 - i * 4, 20 - i * 4, 'S')
    }

    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(36)
    doc.text('R E V I V A', pw / 2, 30, { align: 'center' })
    doc.setLineWidth(0.3)
    doc.setDrawColor(255, 255, 255)
    doc.line(pw / 2 - 32, 36, pw / 2 + 32, 36)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.text('Suas memórias, sempre por perto.', pw / 2, 44, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('PROPOSTA COMERCIAL', pw / 2, 58, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(dados.numero, pw / 2, 65, { align: 'center' })

    let y = 84

    // Apresentação
    const txtApres = (config.texto_apresentacao || 'Olá! Ficamos muito felizes pelo interesse em tornar o seu evento ainda mais especial.\n\nA Reviva transforma momentos únicos em lembranças inesquecíveis através dos nossos fotoímãs produzidos ao vivo durante o evento.\n\nEnquanto seus convidados aproveitam a festa, registramos os melhores momentos e entregamos, em poucos minutos, fotoímãs personalizados que serão levados para casa como uma recordação exclusiva desse dia.')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(50, 50, 50)
    txtApres.split('\n').forEach(linha => {
      if (linha === '') { y += 3; return }
      const ls = doc.splitTextToSize(linha, pw - mg * 2)
      ls.forEach((l: string) => { doc.text(l, mg, y); y += 5.5 })
    })

    y += 5

    // Box cliente com borda esquerda rosa
    const bh = 52
    doc.setFillColor(255, 243, 249)
    doc.roundedRect(mg, y, pw - mg * 2, bh, 2, 2, 'F')
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y, 3, bh, 1, 1, 'F')
    doc.setDrawColor(cr, cg, cb)
    doc.setLineWidth(0.2)
    doc.roundedRect(mg, y, pw - mg * 2, bh, 2, 2, 'S')

    const c1 = mg + 7, c2 = pw / 2 + 3
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(cr, cg, cb)
    doc.text('DADOS DO CLIENTE', c1, y + 5)
    doc.text('DADOS DO EVENTO', c2, y + 5)

    let yc1 = y + 12, yc2 = y + 12
    ;[['Nome', dados.nome_cliente || ''], ['Telefone', dados.telefone_cliente || ''], ['E-mail', dados.email_cliente || '']].forEach(([l, v]) => { campo(l, v, c1, yc1); yc1 += 11 })
    ;[['Tipo de evento', dados.tipo_evento || ''], ['Data', fmtData(dados.data_evento)], ['Cidade', dados.cidade || dados.local_evento || ''], ['Convidados', dados.qtd_convidados ? `${dados.qtd_convidados} pessoas` : '']].forEach(([l, v]) => { campo(l, v, c2, yc2); yc2 += 11 })

    y += bh + 8
    rodape()

    // PÁGINA 2
    doc.addPage()
    doc.setFillColor(cr, cg, cb)
    doc.rect(0, 0, pw, 11, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.text('REVIVA  ·  ' + dados.numero, mg, 7.5)
    doc.setFont('helvetica', 'normal')
    doc.text(dados.nome_cliente || '', pw - mg, 7.5, { align: 'right' })
    y = 20

    // Itens inclusos com checkmarks
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y - 5, pw - mg * 2, 9, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('O QUE ESTÁ INCLUSO', mg + 4, y + 1)
    y += 12

    const itensPadraoP = (config.itens_inclusos || 'Equipe durante todo o evento|Impressão dos fotoímãs em alta qualidade|Produção ao vivo|Estrutura completa|Atendimento personalizado|Lembrança exclusiva para os convidados|Organização completa durante o evento').split('|')
    const itensExtrasP = dados.itens_extras ? dados.itens_extras.split('|') : []
    const itensP = [...itensPadraoP, ...itensExtrasP]
    itensP.forEach(item => {
      doc.setFillColor(cr, cg, cb)
      doc.roundedRect(mg, y - 3.5, 5, 5, 0.8, 0.8, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text('✓', mg + 1.5, y + 0.3)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 30)
      doc.text(item.trim(), mg + 8, y)
      y += 8
    })
    y += 6

    // Resumo do evento
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y - 5, pw - mg * 2, 9, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('RESUMO DO EVENTO', mg + 4, y + 1)
    y += 12

    ;[
      ['Quantidade de convidados', dados.qtd_convidados ? `${dados.qtd_convidados} pessoas` : '—'],
      ['Quantidade estimada de fotoímãs', dados.qtd_fotoimagas ? `${dados.qtd_fotoimagas} unidades` : dados.qtd_convidados ? `${dados.qtd_convidados} unidades` : '—'],
      ['Tempo de atendimento', dados.horas_evento ? `${dados.horas_evento} horas` : '—'],
      ['Cidade / Local', dados.cidade || dados.local_evento || '—'],
      ['Data do evento', fmtData(dados.data_evento)],
    ].forEach(([l, v], i) => {
      if (i % 2 === 0) { doc.setFillColor(252, 246, 251); doc.rect(mg, y - 4, pw - mg * 2, 8, 'F') }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(130, 130, 130)
      doc.text(l, mg + 3, y)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(30, 30, 30)
      doc.text(v, pw - mg - 3, y, { align: 'right' })
      y += 8
    })
    y += 8

    // Investimento destaque
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y, pw - mg * 2, 54, 4, 4, 'F')
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.2)
    doc.line(mg + 5, y + 19, pw - mg - 5, y + 19)
    doc.setTextColor(255, 220, 240)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.text('INVESTIMENTO TOTAL', pw / 2, y + 10, { align: 'center' })
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.text(`R$ ${fmt(valorFinal)}`, pw / 2, y + 31, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(255, 220, 240)
    doc.text(`Entrada (${sinalPct}%): R$ ${fmt(sinal)}`, pw / 2, y + 41, { align: 'center' })
    doc.text(`Saldo: R$ ${fmt(restante)}`, pw / 2, y + 47, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(255, 255, 255)
    doc.text('PIX  ·  Cartão de Crédito', pw / 2, y + 52, { align: 'center' })
    y += 62

    // Condições
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y - 5, pw - mg * 2, 9, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text('CONDIÇÕES DE PAGAMENTO', mg + 4, y + 1)
    y += 12

    const condsP = (config.condicoes_pagamento || 'Entrada de 50% para reserva da data.|Saldo restante até uma semana antes do evento.|Pagamento via PIX.|Pagamento via Cartão de Crédito (com acréscimo das taxas da operadora).').split('|')
    condsP.filter(c => c.trim()).forEach(c => { y = bullet(c.trim(), mg + 2, y) + 2 })
    y += 4

    // Obs
    const validade = dados.validade_dias || 7
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    ;[`• O orçamento é válido por ${validade} dias.`, '• A reserva da data será confirmada somente após o pagamento da entrada.', ...(dados.observacoes ? [`• ${dados.observacoes}`] : [])].forEach(o => {
      const ls = doc.splitTextToSize(o, pw - mg * 2)
      ls.forEach((l: string) => { doc.text(l, mg, y); y += 4.5 })
    })

    rodape()
  }

  doc.save(nomeArq(dados))
}

export function BotoesPDF({ dados, config }: Props) {
  const [modelo, setModelo] = useState<'comercial' | 'premium'>('comercial')
  const [gerando, setGerando] = useState(false)
  const [showModelos, setShowModelos] = useState(false)
  const [erro, setErro] = useState('')

  async function baixar() {
    setGerando(true)
    setErro('')
    try {
      await gerarPDF(dados, config, modelo)
    } catch (e: any) {
      console.error(e)
      setErro('Erro ao gerar PDF. Tente novamente.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <div className="space-y-3">
      {erro && <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-600">{erro}</div>}

      {/* Seletor de modelo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowModelos(!showModelos)}
          className="w-full flex items-center justify-between px-4 py-3"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">Modelo do PDF</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {modelo === 'comercial' ? '📄 Comercial — compacto, rápido para WhatsApp' : '✨ Premium — elegante, ideal para casamentos'}
            </p>
          </div>
          <span className="text-gray-400 text-xs">{showModelos ? '▲' : '▼'}</span>
        </button>
        {showModelos && (
          <div className="border-t border-gray-100">
            {(['comercial', 'premium'] as const).map(m => (
              <button key={m} onClick={() => { setModelo(m); setShowModelos(false) }}
                className={`w-full px-4 py-3 text-left border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${modelo === m ? 'bg-pink-50' : ''}`}>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-2">
                  {m === 'comercial' ? '📄 Modelo Comercial' : '✨ Modelo Premium'}
                  {modelo === m && <span className="text-[10px] bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">Selecionado</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {m === 'comercial' ? '1 página objetiva para envio rápido' : 'Multi-página sofisticado com capa e detalhes'}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Botões */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={baixar} disabled={gerando}
          className="col-span-2 flex items-center justify-center gap-2 bg-[#b5005e] text-white rounded-xl py-3.5 text-sm font-bold shadow-sm disabled:opacity-60 active:scale-95 transition-transform">
          <Download size={16} />
          {gerando ? 'Gerando PDF...' : '⬇️ Baixar PDF'}
        </button>
        <button onClick={() => window.open(`/eventos/orcamentos/${dados.id}/imprimir`, '_blank')}
          className="flex items-center justify-center gap-2 bg-white border-2 border-[#b5005e] text-[#b5005e] rounded-xl py-2.5 text-sm font-semibold active:scale-95 transition-transform">
          <Eye size={15} />
          Visualizar
        </button>
        <button onClick={baixar} disabled={gerando}
          className="flex items-center justify-center gap-2 bg-gray-100 text-gray-700 rounded-xl py-2.5 text-sm font-medium active:scale-95 transition-transform">
          <Printer size={15} />
          Imprimir
        </button>
      </div>
    </div>
  )
}
