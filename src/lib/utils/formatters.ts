export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR')
}

export function formatDatetime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('pt-BR')
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) {
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`
  }
  return phone
}

export const STATUS_LABELS: Record<string, string> = {
  aguardando_fotos: 'Aguardando Fotos',
  orcamento: 'Orçamento',
  aprovado: 'Aprovado',
  producao: 'Em Produção',
  enviado: 'Enviado',
  finalizado: 'Finalizado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
}

export const STATUS_COLORS: Record<string, string> = {
  aguardando_fotos: 'bg-yellow-100 text-yellow-700',
  orcamento: 'bg-orange-100 text-orange-700',
  aprovado: 'bg-blue-100 text-blue-700',
  producao: 'bg-purple-100 text-purple-700',
  enviado: 'bg-blue-100 text-blue-800',
  finalizado: 'bg-green-100 text-green-700',
  entregue: 'bg-gray-100 text-gray-700',
  cancelado: 'bg-red-100 text-red-700',
}

export const STATUS_ORDER: Record<string, string[]> = {
  aguardando_fotos: ['producao', 'cancelado'],
  orcamento: ['aguardando_fotos', 'producao', 'cancelado'],
  aprovado: ['aguardando_fotos', 'producao', 'cancelado'],
  producao: ['enviado', 'cancelado'],
  enviado: ['entregue'],
  finalizado: ['entregue'],
  entregue: [],
  cancelado: [],
}
