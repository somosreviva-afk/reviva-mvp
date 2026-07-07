'use client'

import { useState, useCallback } from 'react'
import { Calculator, Plus, X } from 'lucide-react'

const ADICIONAIS = [
  { key: 'emb', label: 'Embalagem kraft', custo: 1.50, fixo: false },
  { key: 'caixa', label: 'Caixa premium', custo: 3.00, fixo: false },
  { key: 'arte', label: 'Arte personalizada (logo)', custo: 80, fixo: true },
  { key: 'entrega', label: 'Entrega', custo: 30, fixo: true },
]

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const SIMULACAO = [25, 50, 100, 150, 200, 300]

export default function CalculadoraPage() {
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
    <div className="p-4 space-y-4 pb-10">
      <div>
        <h1 className="text-lg font-bold text-purple-900 flex items-center gap-2">
          <Calculator size={20} /> Calculadora de Cota Empresarial
        </h1>
        <p className="text-xs text-purple-500 mt-0.5">Simule o preço para pedidos corporativos</p>
      </div>

      {/* Configuração */}
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
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>10</span><span>500</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Custo unitário do ímã</label>
            <span className="text-sm font-bold text-purple-700">{fmt(custoIma)}</span>
          </div>
          <input type="range" min={2} max={6} step={0.25} value={custoIma}
            onChange={e => setCustoIma(Number(e.target.value))}
            className="w-full accent-purple-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>R$2,00</span><span>R$6,00</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-xs font-medium text-gray-600">Margem de lucro</label>
            <span className="text-sm font-bold text-purple-700">{margem}%</span>
          </div>
          <input type="range" min={20} max={80} step={5} value={margem}
            onChange={e => setMargem(Number(e.target.value))}
            className="w-full accent-purple-600" />
          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
            <span>20%</span><span>80%</span>
          </div>
        </div>

        {/* Adicionais */}
        <div>
          <p className="text-xs font-medium text-gray-600 mb-2">Adicionais</p>
          <div className="flex flex-wrap gap-2">
            {ADICIONAIS.map(a => (
              <button key={a.key} onClick={() => toggleExtra(a.key)}
                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                  extras[a.key]
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}>
                {extras[a.key] ? '✓ ' : '+ '}{a.label}
                <span className="ml-1 opacity-60">
                  ({a.fixo ? fmt(a.custo) : `${fmt(a.custo)}/un`})
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado principal */}
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

      {/* Resumo do orçamento */}
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
              <span>Total a cobrar</span>
              <span>{fmt(preco)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium mt-1">
              <span>Seu lucro ({margem}%)</span>
              <span>{fmt(lucro)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Simulação por quantidade */}
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
                <span className={`text-sm font-semibold w-12 ${ativo ? 'text-purple-700' : 'text-gray-700'}`}>{q} un</span>
                <span className="text-xs text-gray-500 flex-1 text-center">custo {fmt(c)}</span>
                <span className="text-xs text-blue-700 flex-1 text-center">cobra {fmt(p)}</span>
                <span className="text-xs text-green-700 font-semibold">{fmt(l)} lucro</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">Toque em uma linha para selecionar a quantidade</p>
      </div>
    </div>
  )
}
