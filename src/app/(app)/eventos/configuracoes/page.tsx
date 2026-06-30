'use client'

import { useState, useEffect, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { Settings, Save, Plus, Trash2 } from 'lucide-react'

const CONFIG_SECOES = [
  {
    titulo: '🏢 Identidade da empresa',
    campos: [
      { chave: 'nome_empresa', label: 'Nome da empresa', tipo: 'text', placeholder: 'Reviva Imãs' },
      { chave: 'cor_primaria', label: 'Cor principal (hex)', tipo: 'text', placeholder: '#b5005e' },
    ]
  },
  {
    titulo: '📞 Contatos exibidos nos PDFs',
    campos: [
      { chave: 'telefone_empresa', label: 'Telefone / WhatsApp', tipo: 'tel', placeholder: '(11) 99999-9999' },
      { chave: 'instagram_orcamento', label: 'Instagram (orçamentos)', tipo: 'text', placeholder: '@somos_reviva' },
      { chave: 'instagram_empresa', label: 'Instagram (geral)', tipo: 'text', placeholder: '@seuperfil' },
      { chave: 'pix_empresa', label: 'Chave PIX', tipo: 'text', placeholder: 'CPF, CNPJ, email ou telefone' },
    ]
  },
  {
    titulo: '💰 Parâmetros de cálculo',
    campos: [
      { chave: 'custo_fotoimagas_por_convidado', label: 'Custo fotoímã por convidado (R$)', tipo: 'number', placeholder: '4.50' },
      { chave: 'custo_auxiliar_hora', label: 'Custo auxiliar por hora (R$)', tipo: 'number', placeholder: '30.00' },
      { chave: 'margem_lucro_padrao', label: 'Margem de lucro padrão (%)', tipo: 'number', placeholder: '40' },
      { chave: 'sinal_percentual_padrao', label: 'Percentual de sinal padrão (%)', tipo: 'number', placeholder: '50' },
      { chave: 'validade_orcamento_dias', label: 'Validade do orçamento (dias)', tipo: 'number', placeholder: '7' },
    ]
  },
  {
    titulo: '📄 Textos do PDF',
    campos: [
      { chave: 'mensagem_rodape', label: 'Mensagem de rodapé', tipo: 'text', placeholder: 'Obrigada por considerar a Reviva...' },
      { chave: 'texto_apresentacao', label: 'Texto de apresentação', tipo: 'textarea', placeholder: 'Olá! Ficamos muito felizes...' },
      { chave: 'condicoes_pagamento', label: 'Condições de pagamento (separadas por |)', tipo: 'textarea', placeholder: 'Entrada de 50%...|Saldo em até...' },
      { chave: 'itens_inclusos', label: 'Itens inclusos (separados por |)', tipo: 'textarea', placeholder: 'Equipe durante todo o evento|Impressão...' },
    ]
  },
]

// Para compatibilidade com o resto do componente
const CONFIG_CAMPOS = CONFIG_SECOES.flatMap(s => s.campos)

export default function ConfiguracoeEventosPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [tabelaPrecos, setTabelaPrecos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvoMsg, setSalvoMsg] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const carregar = useCallback(async () => {
    const [{ data: cfgs }, { data: tabela }] = await Promise.all([
      supabase.from('eventos_configuracoes').select('chave,valor'),
      supabase.from('eventos_tabela_precos').select('*').order('qtd_min'),
    ])
    const map: Record<string, string> = {}
    ;(cfgs || []).forEach((c: any) => { map[c.chave] = c.valor || '' })
    setConfig(map)
    setTabelaPrecos(tabela || [])
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function salvarConfig() {
    setSalvando(true)
    for (const [chave, valor] of Object.entries(config)) {
      await supabase.from('eventos_configuracoes').upsert({ chave, valor, atualizado_em: new Date().toISOString() }, { onConflict: 'chave' })
    }
    setSalvoMsg('Configurações salvas!')
    setTimeout(() => setSalvoMsg(''), 3000)
    setSalvando(false)
  }

  async function salvarTabela() {
    setSalvando(true)
    // Deletar todas e recriar
    await supabase.from('eventos_tabela_precos').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    for (const row of tabelaPrecos) {
      const { id, ...rest } = row
      if (!id.startsWith('new_')) {
        await supabase.from('eventos_tabela_precos').update(rest).eq('id', id)
      } else {
        await supabase.from('eventos_tabela_precos').insert(rest)
      }
    }
    await carregar()
    setSalvoMsg('Tabela de preços salva!')
    setTimeout(() => setSalvoMsg(''), 3000)
    setSalvando(false)
  }

  function adicionarFaixa() {
    setTabelaPrecos(prev => [...prev, {
      id: `new_${Date.now()}`,
      qtd_min: 0,
      qtd_max: 0,
      preco_sugerido: 0,
      descricao: '',
      ativo: true,
    }])
  }

  function atualizarFaixa(id: string, campo: string, valor: any) {
    setTabelaPrecos(prev => prev.map(f => f.id === id ? { ...f, [campo]: valor } : f))
  }

  function removerFaixa(id: string) {
    setTabelaPrecos(prev => prev.filter(f => f.id !== id))
  }

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando...</div>

  return (
    <div className="p-4 space-y-5 pb-10">
      <div>
        <h1 className="text-lg font-bold text-purple-900">Configurações</h1>
        <p className="text-xs text-purple-500">Dados da empresa e parâmetros de cálculo</p>
      </div>

      {salvoMsg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 text-sm text-green-700 font-medium">{salvoMsg}</div>
      )}

      {/* Config por seção */}
      {CONFIG_SECOES.map(secao => (
        <div key={secao.titulo} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
          <h2 className="font-semibold text-gray-800 text-sm">{secao.titulo}</h2>
          {secao.campos.map(({ chave, label, tipo, placeholder }) => (
            <div key={chave}>
              <label className="text-xs font-medium text-gray-600">{label}</label>
              {tipo === 'textarea' ? (
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400 resize-none"
                  value={config[chave] || ''}
                  onChange={e => setConfig(p => ({ ...p, [chave]: e.target.value }))}
                  placeholder={placeholder}
                />
              ) : (
                <input
                  type={tipo}
                  step={tipo === 'number' ? '0.01' : undefined}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mt-1 focus:outline-none focus:border-purple-400"
                  value={config[chave] || ''}
                  onChange={e => setConfig(p => ({ ...p, [chave]: e.target.value }))}
                  placeholder={placeholder}
                />
              )}
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={salvarConfig}
        disabled={salvando}
        className="w-full bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save size={15} />
        Salvar todas as configurações
      </button>

      {/* Tabela de preços */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 text-sm">Tabela de preços por faixa</h2>
          <button onClick={adicionarFaixa} className="text-purple-600 flex items-center gap-1 text-xs font-medium">
            <Plus size={14} /> Adicionar
          </button>
        </div>
        <p className="text-xs text-gray-400">Define preços sugeridos com base no número de convidados</p>
        {tabelaPrecos.map(faixa => (
          <div key={faixa.id} className="border border-gray-100 rounded-xl p-3 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-500">Mín. convidados</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none focus:border-purple-400"
                  value={faixa.qtd_min} onChange={e => atualizarFaixa(faixa.id, 'qtd_min', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Máx. convidados</label>
                <input type="number" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none focus:border-purple-400"
                  value={faixa.qtd_max} onChange={e => atualizarFaixa(faixa.id, 'qtd_max', parseInt(e.target.value))} />
              </div>
              <div>
                <label className="text-[10px] text-gray-500">Preço (R$)</label>
                <input type="number" step="0.01" className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs mt-0.5 focus:outline-none focus:border-purple-400"
                  value={faixa.preco_sugerido} onChange={e => atualizarFaixa(faixa.id, 'preco_sugerido', parseFloat(e.target.value))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-purple-400"
                value={faixa.descricao || ''} onChange={e => atualizarFaixa(faixa.id, 'descricao', e.target.value)}
                placeholder="Descrição da faixa" />
              <button onClick={() => removerFaixa(faixa.id)} className="text-red-400 p-1">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={salvarTabela}
          disabled={salvando}
          className="w-full bg-purple-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={15} />
          Salvar tabela de preços
        </button>
      </div>
    </div>
  )
}
