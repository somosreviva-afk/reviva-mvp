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

function TabParceria() {
  const [kitSize, setKitSize] = useState(12)
  const [kitSizeStr, setKitSizeStr] = useState('12')
  const [clientesMes, setClientesMes] = useState(10)
  const [desconto, setDesconto] = useState(15)
  const [descontoStr, setDescontoStr] = useState('15')
  const [custoIma, setCustoIma] = useState(4.50)
  const [nomeParceiro, setNomeParceiro] = useState('')
  const [tipoServico, setTipoServico] = useState('fotógrafo')
  const [gerandoPDF, setGerandoPDF] = useState(false)

  const custoKit = custoIma * kitSize
  const precoSemDesconto = custoKit / (1 - 0.50)
  const precoComDesconto = precoSemDesconto * (1 - desconto / 100)
  const lucroKit = precoComDesconto - custoKit
  const lucroMes = lucroKit * clientesMes
  const precoUnitario = precoComDesconto / kitSize

  function handleKitSizeInput(val: string) {
    setKitSizeStr(val)
    const n = parseInt(val)
    if (!isNaN(n) && n > 0) setKitSize(n)
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

      // ── HEADER ROSA ──────────────────────────────────────────────
      doc.setFillColor(181, 0, 94)
      doc.rect(0, 0, W, 42, 'F')

      // Faixa branca decorativa
      doc.setFillColor(255, 255, 255)
      doc.setGlobalAlpha(0.08)
      doc.rect(0, 32, W, 6, 'F')
      doc.setGlobalAlpha(1)

      // Nome da empresa
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(255, 255, 255)
      doc.text('Reviva Imãs', 14, 18)

      // Tagline
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(255, 200, 220)
      doc.text('Suas memórias, sempre por perto  ·  @somos_reviva', 14, 25)

      // Título do documento
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(255, 230, 240)
      doc.text('PROPOSTA DE PARCERIA', 14, 36)

      // Data à direita
      const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(255, 200, 220)
      doc.text(hoje, W - 14, 36, { align: 'right' })

      // ── SAUDAÇÃO ──────────────────────────────────────────────────
      let y = 54
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(50, 10, 30)
      const saudacao = nomeParceiro ? `Olá, ${nomeParceiro}!` : 'Olá!'
      doc.text(saudacao, 14, y)

      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9.5)
      doc.setTextColor(80, 40, 60)
      const intro = doc.splitTextToSize(
        `Sou a Leticia, da Reviva Imãs. Transformamos fotos em fotoímãs personalizados de alta qualidade — lembranças que os clientes levam para casa e guardam para sempre na geladeira, com carinho e afeto.\n\nVejo uma oportunidade incrível de parceria: você ${tipoServico === 'fotógrafo' ? 'fotógrafo(a)' : tipoServico} oferece aos seus clientes um kit exclusivo de fotoímãs personalizados com as fotos do ensaio, agregando ainda mais valor ao seu trabalho e encantando quem contrata.`,
        W - 28
      )
      doc.text(intro, 14, y)
      y += intro.length * 5.5 + 4

      // ── CAIXA: COMO FUNCIONA ──────────────────────────────────────
      doc.setFillColor(254, 242, 248)
      doc.roundedRect(14, y, W - 28, 36, 3, 3, 'F')
      doc.setDrawColor(220, 130, 170)
      doc.setLineWidth(0.3)
      doc.roundedRect(14, y, W - 28, 36, 3, 3, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(181, 0, 94)
      doc.text('✦  COMO FUNCIONA', 20, y + 8)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 20, 40)
      const comoItems = [
        `• Kit com ${kitSize} fotoímãs personalizados com as fotos do ensaio`,
        '• Impressão profissional, materiais de qualidade',
        '• Organização e entrega sob responsabilidade da Reviva Imãs',
        '• Você só repassa para o seu cliente — zero trabalho extra',
      ]
      comoItems.forEach((item, i) => {
        doc.text(item, 20, y + 16 + i * 5)
      })
      y += 44

      // ── CAIXA: INVESTIMENTO ──────────────────────────────────────
      doc.setFillColor(181, 0, 94)
      doc.roundedRect(14, y, W - 28, 42, 3, 3, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(255, 210, 230)
      doc.text('INVESTIMENTO ESPECIAL DE PARCERIA', 20, y + 9)

      // Linha divisória
      doc.setDrawColor(255, 150, 190)
      doc.setLineWidth(0.3)
      doc.line(20, y + 12, W - 20, y + 12)

      // Preço riscado
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(255, 160, 200)
      const labelDe = `Kit com ${kitSize} ímãs — valor de tabela:`
      doc.text(labelDe, 20, y + 19)
      const deStr = fmt(precoSemDesconto)
      doc.text(deStr, W - 20, y + 19, { align: 'right' })
      // linha de risco no preço antigo
      const deW = doc.getTextWidth(deStr)
      doc.setDrawColor(255, 150, 190)
      doc.setLineWidth(0.25)
      doc.line(W - 20 - deW, y + 18.3, W - 20, y + 18.3)

      // Desconto badge
      doc.setFillColor(255, 220, 240)
      doc.roundedRect(20, y + 22, 38, 7, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(181, 0, 94)
      doc.text(`${desconto}% DE DESCONTO`, 39, y + 27, { align: 'center' })

      // Preço final
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text(fmt(precoComDesconto), W - 20, y + 29, { align: 'right' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(255, 210, 230)
      doc.text(`(${fmt(precoUnitario)} por ímã)`, W - 20, y + 36, { align: 'right' })

      y += 50

      // ── ESTIMATIVA DE RECEITA ──────────────────────────────────────
      doc.setFillColor(240, 253, 244)
      doc.roundedRect(14, y, W - 28, 28, 3, 3, 'F')
      doc.setDrawColor(134, 239, 172)
      doc.setLineWidth(0.3)
      doc.roundedRect(14, y, W - 28, 28, 3, 3, 'S')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(22, 101, 52)
      doc.text('✦  POTENCIAL COM ' + clientesMes + ' CLIENTES/MÊS', 20, y + 8)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(21, 128, 61)
      doc.text(`Receita mensal gerada:`, 20, y + 16)
      doc.setFont('helvetica', 'bold')
      doc.text(fmt(precoComDesconto * clientesMes), W - 20, y + 16, { align: 'right' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(74, 222, 128)
      doc.text('Um diferencial que pouquíssimos profissionais oferecem aos seus clientes.', 20, y + 22)

      y += 36

      // ── PRÓXIMOS PASSOS ──────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(181, 0, 94)
      doc.text('PRÓXIMOS PASSOS', 14, y)
      y += 6

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(60, 20, 40)
      const passos = [
        '1. Me confirme o interesse e vamos alinhar os detalhes',
        '2. Você me envia as fotos do ensaio após cada sessão',
        '3. Produzimos e entregamos o kit no prazo combinado',
        '4. Seu cliente recebe uma surpresa incrível!',
      ]
      passos.forEach((p, i) => {
        doc.text(p, 14, y + i * 5.5)
      })
      y += 30

      // ── RODAPÉ ──────────────────────────────────────────────────
      doc.setFillColor(245, 240, 248)
      doc.rect(0, y, W, 30, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(181, 0, 94)
      doc.text('Reviva Imãs', 14, y + 10)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(100, 60, 80)
      doc.text('📸  @somos_reviva', 14, y + 17)
      doc.text('💌  loubrleticia@gmail.com', 14, y + 23)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(7.5)
      doc.setTextColor(181, 0, 94)
      doc.text('Suas memórias, sempre por perto 🌸', W - 14, y + 17, { align: 'right' })

      const nomeArq = `proposta-parceria${nomeParceiro ? '-' + nomeParceiro.toLowerCase().replace(/\s+/g, '-') : ''}.pdf`
      doc.save(nomeArq)
    } catch (err) {
      console.error('Erro ao gerar PDF:', err)
      alert('Não foi possível gerar o PDF. Tente novamente.')
    } finally {
      setGerandoPDF(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Config da parceria */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Configuração da parceria</h2>

        {/* Kit size - LIVRE */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Quantidade de ímãs por cliente</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={kitSizeStr}
              onChange={e => handleKitSizeInput(e.target.value)}
              className="w-24 border-2 border-pink-200 focus:border-pink-500 rounded-xl px-3 py-2 text-base font-bold text-pink-700 text-center focus:outline-none"
              placeholder="12"
            />
            <span className="text-sm text-gray-500 flex-1">ímãs por cliente</span>
            <div className="flex gap-1.5">
              {[6, 9, 12, 15].map(k => (
                <button key={k} onClick={() => { setKitSize(k); setKitSizeStr(String(k)) }}
                  className={`w-9 h-9 rounded-lg border text-xs font-bold transition-all ${
                    kitSize === k ? 'bg-pink-600 text-white border-pink-600' : 'bg-gray-50 border-gray-200 text-gray-500'
                  }`}>
                  {k}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custo unitário */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Custo unitário do ímã</label>
            <span className="text-sm font-bold text-pink-700">{fmt(custoIma)}</span>
          </div>
          <input type="range" min={2} max={8} step={0.25} value={custoIma}
            onChange={e => setCustoIma(Number(e.target.value))}
            className="w-full accent-pink-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>R$2,00</span><span>R$8,00</span></div>
        </div>

        {/* Desconto - LIVRE */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1.5">Desconto para o parceiro</label>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <input
                type="number"
                min={1}
                max={99}
                value={descontoStr}
                onChange={e => handleDescontoInput(e.target.value)}
                className="w-20 border-2 border-pink-200 focus:border-pink-500 rounded-xl px-3 py-2 text-base font-bold text-pink-700 text-center focus:outline-none pr-6"
                placeholder="15"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-pink-500 font-bold text-sm">%</span>
            </div>
            <span className="text-xs text-gray-400 flex-1">Digite o % de desconto</span>
          </div>
          <input type="range" min={5} max={50} step={1} value={Math.min(desconto, 50)}
            onChange={e => { const v = Number(e.target.value); setDesconto(v); setDescontoStr(String(v)) }}
            className="w-full accent-pink-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>5%</span><span>50%</span></div>
        </div>

        {/* Clientes por mês */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Clientes/mês (estimativa)</label>
            <span className="text-sm font-bold text-pink-700">{clientesMes} clientes</span>
          </div>
          <input type="range" min={1} max={50} step={1} value={clientesMes}
            onChange={e => setClientesMes(Number(e.target.value))}
            className="w-full accent-pink-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5"><span>1</span><span>50</span></div>
        </div>
      </div>

      {/* Resultados */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4">
          <p className="text-xs text-orange-600 font-medium">Seu custo por kit</p>
          <p className="text-xl font-bold text-orange-700 mt-1">{fmt(custoKit)}</p>
          <p className="text-[10px] text-orange-400 mt-0.5">{kitSize} ímãs × {fmt(custoIma)}</p>
        </div>
        <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
          <p className="text-xs text-pink-600 font-medium">Preço com {desconto}% off</p>
          <p className="text-xl font-bold text-pink-700 mt-1">{fmt(precoComDesconto)}</p>
          <p className="text-[10px] text-pink-400 mt-0.5 line-through">{fmt(precoSemDesconto)}</p>
        </div>
        <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
          <p className="text-xs text-gray-500 font-medium">Preço por ímã</p>
          <p className="text-xl font-bold text-gray-700 mt-1">{fmt(precoUnitario)}</p>
        </div>
        <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
          <p className="text-xs text-green-600 font-medium">Lucro estimado/mês</p>
          <p className="text-xl font-bold text-green-700 mt-1">{fmt(lucroMes)}</p>
          <p className="text-[10px] text-green-400 mt-0.5">{fmt(lucroKit)} por kit</p>
        </div>
      </div>

      {/* Gerar PDF */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">📄 Proposta em PDF</h2>

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
          <label className="text-xs font-medium text-gray-500 block mb-1">Tipo de serviço do parceiro</label>
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

        <div className="bg-pink-50 rounded-xl p-3 border border-pink-100">
          <p className="text-xs text-pink-700 font-medium mb-1">O PDF vai incluir:</p>
          <p className="text-[11px] text-pink-600 leading-relaxed">
            Header Reviva Imãs · Saudação personalizada · Como funciona ·
            Kit de {kitSize} ímãs com desconto de {desconto}% ({fmt(precoComDesconto)}) ·
            Estimativa com {clientesMes} clientes/mês · Próximos passos · Rodapé com contato
          </p>
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
