import type { jsPDF } from 'jspdf'

export type ConfigPDF = Record<string, string>

export type DadosOrcamento = {
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
  validade_dias?: number
  observacoes?: string
  criado_em?: string
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return [isNaN(r) ? 181 : r, isNaN(g) ? 0 : g, isNaN(b) ? 94 : b]
}

export function fmt(v: number) {
  return Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
}

export function fmtData(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function nomeArquivo(dados: DadosOrcamento) {
  const cliente = dados.nome_cliente || 'Cliente'
  const data = dados.data_evento
    ? new Date(dados.data_evento + 'T00:00:00').toLocaleDateString('pt-BR').replace(/\//g, '-')
    : 'Sem-data'
  return `Orçamento - ${cliente} - ${data}.pdf`
}

export function drawLogo(doc: jsPDF, x: number, y: number, w: number, h: number, corHex: string) {
  const [r, g, b] = hexToRgb(corHex)

  // Fundo rosa
  doc.setFillColor(r, g, b)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')

  // REVIVA
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(h * 0.45)
  doc.text('R E V I V A', x + w / 2, y + h * 0.5, { align: 'center' })

  // Linha
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.2)
  doc.line(x + w * 0.15, y + h * 0.65, x + w * 0.85, y + h * 0.65)

  // Tagline
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(Math.max(5, h * 0.16))
  doc.text('SUAS MEMÓRIAS, SEMPRE POR PERTO', x + w / 2, y + h * 0.82, { align: 'center' })
}

export function drawSectionHeader(doc: jsPDF, text: string, x: number, y: number, w: number, corHex: string) {
  const [r, g, b] = hexToRgb(corHex)
  doc.setTextColor(r, g, b)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text(text, x, y)
  // Linha fina abaixo
  doc.setDrawColor(r, g, b)
  doc.setLineWidth(0.2)
  doc.line(x, y + 1.5, x + w, y + 1.5)
}

export function drawBullet(doc: jsPDF, x: number, y: number, text: string, corHex: string) {
  const [r, g, b] = hexToRgb(corHex)
  doc.setFillColor(r, g, b)
  doc.circle(x + 1, y - 0.8, 0.8, 'F')
  doc.setTextColor(40, 40, 40)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(text, x + 4, y)
}

export function wrapText(doc: jsPDF, text: string, x: number, y: number, maxW: number, lineH: number): number {
  const lines = doc.splitTextToSize(text, maxW)
  lines.forEach((line: string) => {
    doc.text(line, x, y)
    y += lineH
  })
  return y
}
