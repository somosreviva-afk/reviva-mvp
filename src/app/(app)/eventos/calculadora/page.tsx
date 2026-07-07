'use client'

import { useState, useCallback } from 'react'
import { Calculator, FileDown, Loader2 } from 'lucide-react'

const ADICIONAIS = [
  { key: 'emb', label: 'Embalagem kraft', custo: 1.50, fixo: false },
  { key: 'caixa', label: 'Caixa premium', custo: 3.00, fixo: false },
  { key: 'arte', label: 'Arte personalizada (logo)', custo: 80, fixo: true },
  { key: 'entrega', label: 'Entrega', custo: 30, fixo: true },
]

const SIMULACAO = [25, 50, 100, 150, 200, 300]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function TabEmpresarial() {
  const [qtd, setQtd] = useState(100)
  const [custoIma, setCustoIma] = useState(4.50)
  const [margem, setMargem] = useState(50)
  const [extras, setExtras] = useState<Record<string, boolean>>({})

  const toggleExtra = (key: string) => setExtras(p => ({ ...p, [key]: !p[key] }))

  const calcCusto = useCallback((q: number) => {
    let c = custoIma * q
    ADICIONAIS.forEach(a => {
      if (extras[a.key]) c += a.fixo ? a.custo : a.custo * q
    })
    return c
  }, [custoIma, extras])

  const custo = calcCusto(qtd)
  const preco = custo / (1 - margem / 100)
  const lucro = preco - custo
  const unitario = preco / qtd

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Configuração do pedido</h2>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Quantidade de ímãs</label>
            <span className="text-sm font-bold text-purple-700">{qtd} unidades</span>
          </div>
          <input type="range" min={10} max={500} step={5} value={qtd}
            onChange={e => setQtd(Number(e.target.value))}
            className="w-full accent-purple-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>10</span><span>500</span></div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Custo unitário do ímã</label>
            <span className="text-sm font-bold text-purple-700">{fmt(custoIma)}</span>
          </div>
          <input type="range" min={2} max={6} step={0.25} value={custoIma}
            onChange={e => setCustoIma(Number(e.target.value))}
            className="w-full accent-purple-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>R$2,00</span><span>R$6,00</span></div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Margem de lucro</label>
            <span className="text-sm font-bold text-purple-700">{margem}%</span>
          </div>
          <input type="range" min={20} max={80} step={5} value={margem}
            onChange={e => setMargem(Number(e.target.value))}
            className="w-full accent-purple-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>20%</span><span>80%</span></div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Adicionais</p>
          <div className="flex flex-wrap gap-2">
            {ADICIONAIS.map(a => (
              <button key={a.key} onClick={() => toggleExtra(a.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  extras[a.key] ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                {extras[a.key] ? '✓ ' : '+ '}{a.label}
                <span className="ml-1 opacity-60">({a.fixo ? fmt(a.custo) : `${fmt(a.custo)}/un`})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-xs text-orange-600 font-medium">Seu custo total</p>
          <p className="text-xl font-bold text-orange-700 mt-1">{fmt(custo)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs text-blue-600 font-medium">Preço para cobrar</p>
          <p className="text-xl font-bold text-blue-700 mt-1">{fmt(preco)}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium">Preço por unidade</p>
          <p className="text-xl font-bold text-gray-700 mt-1">{fmt(unitario)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium">Seu lucro</p>
          <p className="text-xl font-bold text-green-700 mt-1">{fmt(lucro)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Resumo do orçamento</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{qtd}x fotoímã ({fmt(custoIma)} cada)</span>
            <span>{fmt(custoIma * qtd)}</span>
          </div>
          {ADICIONAIS.map(a => extras[a.key] && (
            <div key={a.key} className="flex justify-between text-gray-600">
              <span>{a.label}{!a.fixo ? ` (${qtd}x)` : ''}</span>
              <span>{fmt(a.fixo ? a.custo : a.custo * qtd)}</span>
            </div>
          ))}
          <div className="border-t border-gray-100 pt-2 mt-2">
            <div className="flex justify-between font-bold text-gray-900 text-base">
              <span>Total a cobrar</span><span>{fmt(preco)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium mt-1">
              <span>Seu lucro ({margem}%)</span><span>{fmt(lucro)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Comparativo por quantidade</h2>
        <div className="space-y-2">
          {SIMULACAO.map(q => {
            const c = calcCusto(q)
            const p = c / (1 - margem / 100)
            const l = p - c
            const ativo = q === qtd
            return (
              <div key={q} onClick={() => setQtd(q)}
                className={`flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer transition-all ${
                  ativo ? 'bg-purple-100 border border-purple-200' : 'bg-gray-50 border border-transparent'
                }`}>
                <span className={`text-sm font-semibold w-12 ${ativo ? 'text-purple-700' : 'text-gray-700'}`}>{q}</span>
                <span className="text-xs text-gray-500 flex-1 text-center">custo {fmt(c)}</span>
                <span className="text-xs text-blue-700 flex-1 text-center">cobra {fmt(p)}</span>
                <span className="text-xs text-green-700 font-semibold">{fmt(l)}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">Toque em uma linha para selecionar</p>
      </div>
    </div>
  )
}

type KitItem = { id: number; qtd: number; qtdStr: string; preco: number; precoStr: string }

let nextId = 1

function TabParceria() {
  const [kits, setKits] = useState<KitItem[]>([
    { id: nextId++, qtd: 6, qtdStr: '6', preco: 64.90, precoStr: '64,90' },
  ])
  const [desconto, setDesconto] = useState(15)
  const [descontoStr, setDescontoStr] = useState('15')
  const [custoIma, setCustoIma] = useState(4.50)
  const [nomeParceiro, setNomeParceiro] = useState('')
  const [tipoServico, setTipoServico] = useState('fotógrafo')
  const [gerandoPDF, setGerandoPDF] = useState(false)

  function addKit() {
    setKits(k => [...k, { id: nextId++, qtd: 12, qtdStr: '12', preco: 89.90, precoStr: '89,90' }])
  }
  function removeKit(id: number) {
    setKits(k => k.filter(x => x.id !== id))
  }
  function updateKit(id: number, field: 'qtd' | 'preco', raw: string) {
    setKits(k => k.map(x => {
      if (x.id !== id) return x
      if (field === 'qtd') {
        const n = parseInt(raw)
        return { ...x, qtdStr: raw, qtd: (!isNaN(n) && n > 0) ? n : x.qtd }
      } else {
        const n = parseFloat(raw.replace(',', '.'))
        return { ...x, precoStr: raw, preco: (!isNaN(n) && n > 0) ? n : x.preco }
      }
    }))
  }

  function handleDescontoInput(val: string) {
    setDescontoStr(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 99) setDesconto(n)
  }

  async function gerarPDF() {
    setGerandoPDF(true)
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const W = 210

      // ── HEADER ───────────────────────────────────────────────────
      doc.setFillColor(181, 0, 94)
      doc.rect(0, 0, W, 40, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text('Reviva Imas', 14, 17)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 200, 220)
      doc.text('Suas memorias, sempre por perto  .  @somos_reviva', 14, 24)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(255, 230, 240)
      doc.text('PROPOSTA DE PARCERIA', 14, 35)

      const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(255, 200, 220)
      doc.text(hoje, W - 14, 35, { align: 'right' })

      // ── SAUDAÇÃO ──────────────────────────────────────────────────
      let y = 52
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(50, 10, 30)
      doc.text(nomeParceiro ? `Ola, ${nomeParceiro}!` : 'Ola!', 14, y)

      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(80, 40, 60)
      const profissao = tipoServico === 'fotógrafo' ? 'fotografo(a)' : tipoServico
      const introText = `Sou a Leticia, da Reviva Imas. Transformamos fotos em fotoimaos personalizados de alta qualidade - lembrancas que os clientes levam para casa e guardam para sempre.\n\nQuero propor uma parceria: voce ${profissao} oferece aos seus clientes um kit exclusivo de fotoimaos com as fotos do ensaio, agregando ainda mais valor ao seu trabalho.`
      const intro = doc.splitTextToSize(introText, W - 28)
      doc.text(intro, 14, y)
      y += intro.length * 5.2 + 6

      // ── COMO FUNCIONA ─────────────────────────────────────────────
      doc.setFillColor(254, 242, 248)
      doc.roundedRect(14, y, W - 28, 34, 3, 3, 'F')
      doc.setDrawColor(220, 130, 170)
      doc.setLineWidth(0.3)
      doc.roundedRect(14, y, W - 28, 34, 3, 3, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(181, 0, 94)
      doc.text('COMO FUNCIONA', 20, y + 8)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 20, 40)
      const comoItems = [
        '- Fotoimaos personalizados com as fotos do ensaio',
        '- Impressao profissional, materiais de qualidade',
        '- Organizacao e entrega pela Reviva Imas',
        '- Voce so repassa para o seu cliente, zero trabalho extra',
      ]
      comoItems.forEach((item, i) => doc.text(item, 20, y + 15 + i * 5))
      y += 42

      // ── KITS ─────────────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(181, 0, 94)
      doc.text(`OPCOES DE KIT — ${desconto}% OFF PARA PARCEIROS`, 14, y)
      y += 5

      // Badge desconto
      doc.setFillColor(181, 0, 94)
      doc.roundedRect(14, y, 52, 8, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(255, 255, 255)
      doc.text(`${desconto}% DE DESCONTO`, 40, y + 5.5, { align: 'center' })
      y += 14

      kits.forEach((kit) => {
        const precoComDesc = kit.preco * (1 - desconto / 100)
        const precoUnit = precoComDesc / kit.qtd

        doc.setFillColor(255, 247, 251)
        doc.roundedRect(14, y, W - 28, 24, 3, 3, 'F')
        doc.setDrawColor(240, 180, 210)
        doc.setLineWidth(0.3)
        doc.roundedRect(14, y, W - 28, 24, 3, 3, 'S')

        // Título do kit
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(80, 20, 50)
        doc.text(`Kit ${kit.qtd} fotoimaos`, 20, y + 8)

        // Preço de tabela riscado
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(180, 120, 150)
        const tabelaStr = `De: ${fmt(kit.preco)}`
        doc.text(tabelaStr, 20, y + 15)

        // Linha de risco
        const tW = doc.getTextWidth(tabelaStr)
        doc.setDrawColor(180, 120, 150)
        doc.setLineWidth(0.3)
        doc.line(20, y + 14.3, 20 + tW, y + 14.3)

        // Preço parceiro
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(14)
        doc.setTextColor(181, 0, 94)
        doc.text(fmt(precoComDesc), W - 20, y + 10, { align: 'right' })

        // Preço por imã
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(140, 80, 110)
        doc.text(`${fmt(precoUnit)} por ima`, W - 20, y + 17, { align: 'right' })

        // "Por parceiro"
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(181, 0, 94)
        doc.text('preco parceiro', W - 20, y + 22, { align: 'right' })

        y += 30
      })

      y += 4

      // ── MENSAGEM SIMPLES ─────────────────────────────────────────
      doc.setFillColor(245, 240, 248)
      doc.roundedRect(14, y, W - 28, 22, 3, 3, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(60, 20, 50)
      const msgText = doc.splitTextToSize(`Como parceiro(a), voce tem ${desconto}% de desconto em todos os kits. Basta me avisar apos cada sessao e cuidamos de tudo!`, W - 36)
      doc.text(msgText, 20, y + 8)
      y += 28

      // ── RODAPÉ ──────────────────────────────────────────────────
      y = Math.max(y, 252)
      doc.setFillColor(245, 240, 248)
      doc.rect(0, y, W, 30, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(181, 0, 94)
      doc.text('Reviva Imas', 14, y + 10)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 60, 80)
      doc.text('@somos_reviva', 14, y + 17)
      doc.text('loubrleticia@gmail.com', 14, y + 23)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(181, 0, 94)
      doc.text('Suas memorias, sempre por perto', W - 14, y + 17, { align: 'right' })

      const nomeArq = `proposta-parceria${nomeParceiro ? '-' + nomeParceiro.toLowerCase().replace(/\s+/g, '-') : ''}.pdf`
      doc.save(nomeArq)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Erro ao gerar o PDF: ' + String(err))
    } finally {
      setGerandoPDF(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Desconto global */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Desconto para o parceiro</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="number" min={1} max={99}
              value={descontoStr}
              onChange={e => handleDescontoInput(e.target.value)}
              className="w-20 border-2 border-pink-200 focus:border-pink-500 rounded-xl px-3 py-2 text-xl font-bold text-pink-700 text-center focus:outline-none pr-5"
              placeholder="15"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-pink-500 font-bold">%</span>
          </div>
          <div className="flex-1">
            <input type="range" min={5} max={50} step={1} value={Math.min(desconto, 50)}
              onChange={e => { const v = Number(e.target.value); setDesconto(v); setDescontoStr(String(v)) }}
              className="w-full accent-pink-600" />
            <div className="flex justify-between text-[10px] text-gray-400"><span>5%</span><span>50%</span></div>
          </div>
        </div>
        <p className="text-xs text-gray-400">Este desconto será aplicado em todos os kits da proposta.</p>
      </div>

      {/* Kits */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Kits da proposta</h2>
          <button onClick={addKit}
            className="text-xs bg-pink-100 text-pink-700 px-3 py-1.5 rounded-lg font-semibold">
            + Adicionar kit
          </button>
        </div>

        {kits.map(kit => {
          const precoComDesc = kit.preco * (1 - desconto / 100)
          return (
            <div key={kit.id} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-medium">Qtd de ímãs</label>
                  <input
                    type="number" min={1}
                    value={kit.qtdStr}
                    onChange={e => updateKit(kit.id, 'qtd', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-pink-700 text-center focus:outline-none focus:border-pink-400 bg-white mt-0.5"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-500 font-medium">Preço de tabela</label>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-xs text-gray-400">R$</span>
                    <input
                      type="text" inputMode="decimal"
                      value={kit.precoStr}
                      onChange={e => updateKit(kit.id, 'preco', e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-bold text-gray-700 text-center focus:outline-none focus:border-pink-400 bg-white"
                    />
                  </div>
                </div>
                {kits.length > 1 && (
                  <button onClick={() => removeKit(kit.id)}
                    className="text-gray-300 text-lg font-light leading-none pb-0.5 self-end mb-1">✕</button>
                )}
              </div>
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] text-gray-400 line-through">{fmt(kit.preco)}</span>
                <span className="text-sm font-bold text-pink-700">{fmt(precoComDesc)}</span>
                <span className="text-[10px] text-green-600 font-medium">{desconto}% off</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Custo interno */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between mb-1">
          <label className="text-xs font-medium text-gray-500">Seu custo por ímã (interno)</label>
          <span className="text-sm font-bold text-gray-500">{fmt(custoIma)}</span>
        </div>
        <input type="range" min={2} max={8} step={0.25} value={custoIma}
          onChange={e => setCustoIma(Number(e.target.value))}
          className="w-full accent-gray-400" />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>R$2,00</span><span>R$8,00</span></div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {kits.map(kit => {
            const custo = custoIma * kit.qtd
            const venda = kit.preco * (1 - desconto / 100)
            const lucro = venda - custo
            return (
              <div key={kit.id} className="bg-green-50 rounded-xl p-2.5 border border-green-100">
                <p className="text-[10px] text-green-600">Lucro kit {kit.qtd} ímãs</p>
                <p className="text-sm font-bold text-green-700">{fmt(lucro)}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Gerar PDF */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Proposta em PDF</h2>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Nome do parceiro (opcional)</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-pink-400"
            placeholder="Ex: Ana, Carlos, Studio X..."
            value={nomeParceiro}
            onChange={e => setNomeParceiro(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 block mb-1">Tipo de serviço</label>
          <div className="flex gap-2 flex-wrap">
            {['fotógrafo', 'fotógrafa', 'videomaker', 'outro'].map(t => (
              <button key={t} onClick={() => setTipoServico(t)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all capitalize ${
                  tipoServico === t ? 'bg-pink-100 border-pink-300 text-pink-700' : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={gerarPDF}
          disabled={gerandoPDF}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all bg-[#b5005e] text-white active:scale-95 disabled:opacity-60"
        >
          {gerandoPDF
            ? <><Loader2 size={16} className="animate-spin" /> Gerando PDF...</>
            : <><FileDown size={16} /> Gerar PDF da Proposta</>}
        </button>
      </div>
    </div>
  )
}

export default function CalculadoraPage() {
  const [aba, setAba] = useState<'empresarial' | 'parceria'>('empresarial')

  return (
    <div className="p-4 space-y-4 pb-10">
      <div>
        <h1 className="text-lg font-bold text-purple-900 flex items-center gap-2">
          <Calculator size={20} /> Calculadora
        </h1>
        <p className="text-xs text-purple-500 mt-0.5">Simule preços e gere propostas</p>
      </div>

      {/* Abas */}
      <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
        <button onClick={() => setAba('empresarial')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            aba === 'empresarial' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500'
          }`}>
          <Calculator size={13} /> Cota Empresarial
        </button>
        <button onClick={() => setAba('parceria')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            aba === 'parceria' ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-500'
          }`}>
          🤝 Parceria
        </button>
      </div>

      {aba === 'empresarial' ? <TabEmpresarial /> : <TabParceria />}
    </div>
  )
}
