import jsPDF from 'jspdf'
import {
  ConfigPDF, DadosOrcamento,
  hexToRgb, fmt, fmtData, nomeArquivo,
  drawLogo, drawSectionHeader, drawBullet, wrapText
} from './utils'

export function gerarPdfComercial(dados: DadosOrcamento, config: ConfigPDF) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()   // 210
  const ph = doc.internal.pageSize.getHeight()  // 297
  const mg = 15
  const cor = config.cor_primaria || '#b5005e'
  const [cr, cg, cb] = hexToRgb(cor)

  let y = mg

  // ── CABEÇALHO ──────────────────────────────────────────────────────────
  drawLogo(doc, mg, y, 65, 24, cor)

  // Número + data
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(cr, cg, cb)
  doc.text('ORÇAMENTO', pw - mg, y + 8, { align: 'right' })
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.text(dados.numero, pw - mg, y + 15, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(120, 120, 120)
  doc.text(`Emitido em ${new Date().toLocaleDateString('pt-BR')}`, pw - mg, y + 21, { align: 'right' })

  y += 32

  // Linha divisória rosa
  doc.setDrawColor(cr, cg, cb)
  doc.setLineWidth(0.5)
  doc.line(mg, y, pw - mg, y)
  y += 7

  // ── DADOS DO CLIENTE ────────────────────────────────────────────────────
  const col1 = mg
  const col2 = pw / 2 + 3

  drawSectionHeader(doc, 'DADOS DO CLIENTE', col1, y, pw / 2 - mg - 3, cor)
  drawSectionHeader(doc, 'DADOS DO EVENTO', col2, y, pw / 2 - mg - 3, cor)
  y += 5

  const dadosCliente: [string, string][] = [
    ['Nome', dados.nome_cliente || '—'],
    ['Telefone', dados.telefone_cliente || '—'],
    ['E-mail', dados.email_cliente || '—'],
  ]
  const dadosEvt: [string, string][] = [
    ['Tipo de evento', dados.tipo_evento || '—'],
    ['Data', fmtData(dados.data_evento)],
    ['Cidade / Local', dados.cidade || dados.local_evento || '—'],
    ['Convidados', dados.qtd_convidados ? `${dados.qtd_convidados} pessoas` : '—'],
    ['Duração', dados.horas_evento ? `${dados.horas_evento} horas` : '—'],
  ]

  const yBase = y
  let y1 = yBase
  dadosCliente.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text(label.toUpperCase(), col1, y1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(valor, col1, y1 + 4)
    y1 += 9.5
  })

  let y2 = yBase
  dadosEvt.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(120, 120, 120)
    doc.text(label.toUpperCase(), col2, y2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(valor, col2, y2 + 4)
    y2 += 9.5
  })

  y = Math.max(y1, y2) + 5

  // Divisória leve
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(mg, y, pw - mg, y)
  y += 7

  // ── O QUE ESTÁ INCLUSO ─────────────────────────────────────────────────
  drawSectionHeader(doc, 'O QUE ESTÁ INCLUSO', mg, y, pw - mg * 2, cor)
  y += 5

  const itens = (config.itens_inclusos || 'Equipe durante todo o evento|Impressão dos fotoímãs em alta qualidade|Produção ao vivo|Estrutura completa|Atendimento personalizado|Lembrança exclusiva para os convidados|Organização completa durante o evento').split('|')

  const midIdx = Math.ceil(itens.length / 2)
  let yi1 = y, yi2 = y

  itens.slice(0, midIdx).forEach(item => {
    drawBullet(doc, col1, yi1, item.trim(), cor)
    yi1 += 5.5
  })
  itens.slice(midIdx).forEach(item => {
    drawBullet(doc, col2, yi2, item.trim(), cor)
    yi2 += 5.5
  })

  y = Math.max(yi1, yi2) + 6

  // Divisória leve
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.3)
  doc.line(mg, y, pw - mg, y)
  y += 7

  // ── INVESTIMENTO ───────────────────────────────────────────────────────
  const valorFinal = Number(dados.valor_final || dados.valor_sugerido || 0)
  const sinalPct = Number(dados.sinal_percentual || 50)
  const sinal = valorFinal * (sinalPct / 100)
  const restante = valorFinal - sinal

  const boxH = 42
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(mg, y, pw - mg * 2, boxH, 3, 3, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('INVESTIMENTO', mg + 6, y + 8)

  doc.setFontSize(22)
  doc.text(`R$ ${fmt(valorFinal)}`, mg + 6, y + 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(255, 210, 230)
  doc.text(`Entrada (${sinalPct}%): R$ ${fmt(sinal)}`, mg + 6, y + 28)
  doc.text(`Saldo restante: R$ ${fmt(restante)}`, mg + 6, y + 34)

  // Coluna direita: forma de pagamento
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(255, 255, 255)
  doc.text('FORMA DE PAGAMENTO', pw - 80, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 230, 242)
  doc.text('✓  PIX', pw - 80, y + 15)
  doc.text('✓  Cartão de Crédito (+ taxas)', pw - 80, y + 21)
  if (config.pix_empresa) {
    doc.setFontSize(7)
    doc.setFont('helvetica', 'bold')
    doc.text(`Chave PIX: ${config.pix_empresa}`, pw - 80, y + 30)
  }

  y += boxH + 8

  // ── CONDIÇÕES DE PAGAMENTO ─────────────────────────────────────────────
  drawSectionHeader(doc, 'CONDIÇÕES DE PAGAMENTO', mg, y, pw - mg * 2, cor)
  y += 5

  const condicoes = (config.condicoes_pagamento || 'Entrada de 50% para reserva da data.|Saldo restante até uma semana antes do evento.|Pagamento via PIX.|Pagamento via Cartão de Crédito (com acréscimo das taxas da operadora).').split('|')

  condicoes.filter(c => c.trim()).forEach(c => {
    drawBullet(doc, mg, y, c.trim(), cor)
    y += 5.5
  })

  y += 4

  // ── OBSERVAÇÕES ────────────────────────────────────────────────────────
  const validade = dados.validade_dias || 7

  drawSectionHeader(doc, 'OBSERVAÇÕES', mg, y, pw - mg * 2, cor)
  y += 5

  const obsList = [
    `O orçamento é válido por ${validade} dias.`,
    'A reserva da data será confirmada somente após o pagamento da entrada.',
    ...(dados.observacoes ? [dados.observacoes] : []),
  ]
  obsList.forEach(o => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(50, 50, 50)
    y = wrapText(doc, `• ${o}`, mg, y, pw - mg * 2, 4.5)
  })

  // ── RODAPÉ ─────────────────────────────────────────────────────────────
  const rodapeY = ph - 22
  doc.setFillColor(cr, cg, cb)
  doc.rect(0, rodapeY, pw, ph - rodapeY, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text(config.nome_empresa || 'Reviva Imãs', pw / 2, rodapeY + 7, { align: 'center' })

  const contatos: string[] = []
  if (config.instagram_orcamento || config.instagram_empresa) contatos.push(`📸 ${config.instagram_orcamento || config.instagram_empresa}`)
  if (config.telefone_empresa) contatos.push(`📱 ${config.telefone_empresa}`)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 220, 238)
  doc.text(contatos.join('     '), pw / 2, rodapeY + 13, { align: 'center' })

  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(255, 200, 228)
  const msgRodape = config.mensagem_rodape || 'Obrigada por considerar a Reviva para fazer parte desse momento tão especial.'
  doc.text(msgRodape, pw / 2, rodapeY + 19, { align: 'center' })

  doc.save(nomeArquivo(dados))
}
