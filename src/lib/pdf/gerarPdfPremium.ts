import jsPDF from 'jspdf'
import {
  ConfigPDF, DadosOrcamento,
  hexToRgb, fmt, fmtData, nomeArquivo,
  drawBullet, wrapText
} from './utils'

export function gerarPdfPremium(dados: DadosOrcamento, config: ConfigPDF) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()
  const mg = 18
  const cor = config.cor_primaria || '#b5005e'
  const [cr, cg, cb] = hexToRgb(cor)

  // ── PÁGINA 1: CAPA ──────────────────────────────────────────────────────

  // Fundo rosa no topo (60mm)
  doc.setFillColor(cr, cg, cb)
  doc.rect(0, 0, pw, 68, 'F')

  // Arcos decorativos
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.4)
  doc.setFillColor(0, 0, 0)  // reset
  for (let i = 0; i < 3; i++) {
    doc.ellipse(pw - 10 + i * 6, 10 - i * 4, 18 - i * 3, 18 - i * 3, 'S')
    doc.ellipse(10 - i * 4, 60 + i * 4, 12 - i * 3, 12 - i * 3, 'S')
  }

  // Logo REVIVA (centralizado na capa)
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(34)
  doc.text('R E V I V A', pw / 2, 32, { align: 'center' })

  doc.setLineWidth(0.3)
  doc.setDrawColor(255, 255, 255)
  doc.line(pw / 2 - 30, 38, pw / 2 + 30, 38)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Suas memórias, sempre por perto.', pw / 2, 45, { align: 'center' })

  // Subtítulo na faixa rosa
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('PROPOSTA COMERCIAL', pw / 2, 58, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.text(dados.numero, pw / 2, 63.5, { align: 'center' })

  let y = 82

  // ── APRESENTAÇÃO ────────────────────────────────────────────────────────
  const textApres = config.texto_apresentacao ||
    'Olá! Ficamos muito felizes pelo interesse em tornar o seu evento ainda mais especial.\n\nA Reviva transforma momentos únicos em lembranças inesquecíveis através dos nossos fotoímãs produzidos ao vivo durante o evento.\n\nEnquanto seus convidados aproveitam a festa, registramos os melhores momentos e entregamos, em poucos minutos, fotoímãs personalizados que serão levados para casa como uma recordação exclusiva desse dia.'

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(50, 50, 50)
  const linhasApres = doc.splitTextToSize(textApres.replace(/\\n/g, '\n'), pw - mg * 2)
  linhasApres.forEach((linha: string) => {
    if (linha === '') { y += 3; return }
    doc.text(linha, mg, y)
    y += 5.5
  })

  y += 6

  // ── DADOS DO CLIENTE ────────────────────────────────────────────────────
  // Box com fundo rosé claro
  const boxClienteH = 44
  doc.setFillColor(255, 243, 249)
  doc.roundedRect(mg, y, pw - mg * 2, boxClienteH, 3, 3, 'F')
  doc.setDrawColor(cr, cg, cb)
  doc.setLineWidth(0.3)
  doc.roundedRect(mg, y, pw - mg * 2, boxClienteH, 3, 3, 'S')

  // Barra rosa lateral
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(mg, y, 3, boxClienteH, 1, 1, 'F')

  let ycl = y + 7
  const col1 = mg + 7
  const col2 = pw / 2 + 3

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(cr, cg, cb)
  doc.text('DADOS DO CLIENTE', col1, y + 5)
  doc.text('DADOS DO EVENTO', col2, y + 5)

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
  ]

  ycl = y + 12
  let ycl2 = ycl
  dadosCliente.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(160, 160, 160)
    doc.text(label.toUpperCase(), col1, ycl)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(valor, col1, ycl + 4)
    ycl += 10
  })
  dadosEvt.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(160, 160, 160)
    doc.text(label.toUpperCase(), col2, ycl2)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(valor, col2, ycl2 + 4)
    ycl2 += 10
  })

  y += boxClienteH + 10

  // ── PÁGINA 2 ─────────────────────────────────────────────────────────────
  doc.addPage()
  y = mg

  // Header mini nas demais páginas
  doc.setFillColor(cr, cg, cb)
  doc.rect(0, 0, pw, 12, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.text('REVIVA  ·  ' + dados.numero, mg, 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(dados.nome_cliente || '', pw - mg, 8, { align: 'right' })

  y = 20

  // ── O QUE ESTÁ INCLUSO ──────────────────────────────────────────────────
  // Título com fundo
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(mg, y - 5, pw - mg * 2, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('O QUE ESTÁ INCLUSO', mg + 4, y + 1.5)

  y += 12

  const itens = (config.itens_inclusos || 'Equipe durante todo o evento|Impressão dos fotoímãs em alta qualidade|Produção ao vivo|Estrutura completa|Atendimento personalizado|Lembrança exclusiva para os convidados|Organização completa durante o evento').split('|')

  itens.forEach(item => {
    // Checkmark estilizado
    doc.setFillColor(cr, cg, cb)
    doc.roundedRect(mg, y - 3.5, 5, 5, 1, 1, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.text('✓', mg + 1.5, y + 0.5)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(item.trim(), mg + 8, y)
    y += 8
  })

  y += 5

  // ── RESUMO DO EVENTO ────────────────────────────────────────────────────
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(mg, y - 5, pw - mg * 2, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('RESUMO DO EVENTO', mg + 4, y + 1.5)
  y += 13

  const resumo: [string, string][] = [
    ['Quantidade de convidados', dados.qtd_convidados ? `${dados.qtd_convidados} pessoas` : '—'],
    ['Quantidade estimada de fotoímãs', dados.qtd_fotoimagas ? `${dados.qtd_fotoimagas} unidades` : dados.qtd_convidados ? `${dados.qtd_convidados} unidades` : '—'],
    ['Tempo de atendimento', dados.horas_evento ? `${dados.horas_evento} horas` : '—'],
    ['Cidade / Local', dados.cidade || dados.local_evento || '—'],
    ['Data do evento', fmtData(dados.data_evento)],
  ]

  resumo.forEach(([label, valor], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(252, 246, 251)
      doc.rect(mg, y - 4, pw - mg * 2, 8, 'F')
    }
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(label, mg + 3, y)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(30, 30, 30)
    doc.text(valor, pw - mg - 3, y, { align: 'right' })
    y += 8
  })

  y += 8

  // ── INVESTIMENTO ────────────────────────────────────────────────────────
  const valorFinal = Number(dados.valor_final || dados.valor_sugerido || 0)
  const sinalPct = Number(dados.sinal_percentual || 50)
  const sinal = valorFinal * (sinalPct / 100)
  const restante = valorFinal - sinal

  // Box investimento principal
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(mg, y, pw - mg * 2, 52, 4, 4, 'F')

  // Decoração interna
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.2)
  doc.line(mg + 4, y + 18, pw - mg - 4, y + 18)

  doc.setTextColor(255, 230, 242)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('INVESTIMENTO TOTAL', pw / 2, y + 9, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.text(`R$ ${fmt(valorFinal)}`, pw / 2, y + 30, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(255, 220, 238)
  doc.text(`Entrada (${sinalPct}%): R$ ${fmt(sinal)}`, pw / 2 - 25, y + 40, { align: 'center' })
  doc.text(`Saldo: R$ ${fmt(restante)}`, pw / 2 + 25, y + 40, { align: 'center' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(255, 255, 255)
  doc.text('PIX  ·  Cartão de Crédito', pw / 2, y + 48, { align: 'center' })

  y += 60

  // ── CONDIÇÕES DE PAGAMENTO ──────────────────────────────────────────────
  doc.setFillColor(cr, cg, cb)
  doc.roundedRect(mg, y - 5, pw - mg * 2, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('CONDIÇÕES DE PAGAMENTO', mg + 4, y + 1.5)
  y += 13

  const condicoes = (config.condicoes_pagamento || 'Entrada de 50% para reserva da data.|Saldo restante até uma semana antes do evento.|Pagamento via PIX.|Pagamento via Cartão de Crédito (com acréscimo das taxas da operadora).').split('|')
  condicoes.filter(c => c.trim()).forEach(c => {
    drawBullet(doc, mg + 2, y, c.trim(), cor)
    y += 6
  })

  y += 5

  // ── OBSERVAÇÕES ────────────────────────────────────────────────────────
  const validade = dados.validade_dias || 7
  const obsList = [
    `O orçamento é válido por ${validade} dias.`,
    'A reserva da data será confirmada somente após o pagamento da entrada.',
    ...(dados.observacoes ? [dados.observacoes] : []),
  ]

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(8)
  doc.setTextColor(130, 130, 130)
  obsList.forEach(o => {
    y = wrapText(doc, `• ${o}`, mg, y, pw - mg * 2, 4.5)
  })

  // ── RODAPÉ ─────────────────────────────────────────────────────────────
  // Verifica se cabe na página, senão adiciona
  if (y > ph - 35) {
    doc.addPage()
    // Header mini
    doc.setFillColor(cr, cg, cb)
    doc.rect(0, 0, pw, 12, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('REVIVA  ·  ' + dados.numero, mg, 8)
    y = 20
  }

  const rodapeY = ph - 28
  doc.setFillColor(cr, cg, cb)
  doc.rect(0, rodapeY, pw, ph - rodapeY, 'F')

  // Linha decorativa acima do rodapé
  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.3)
  doc.line(mg, rodapeY + 6, pw - mg, rodapeY + 6)

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text(config.nome_empresa || 'Reviva Imãs', pw / 2, rodapeY + 5, { align: 'center' })

  const contatos: string[] = []
  if (config.instagram_orcamento || config.instagram_empresa) contatos.push(`📸 ${config.instagram_orcamento || config.instagram_empresa}`)
  if (config.telefone_empresa) contatos.push(`📱 ${config.telefone_empresa}`)
  if (config.pix_empresa) contatos.push(`PIX: ${config.pix_empresa}`)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(255, 220, 238)
  doc.text(contatos.join('   '), pw / 2, rodapeY + 14, { align: 'center' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(255, 200, 228)
  const msgRodape = config.mensagem_rodape || 'Obrigada por considerar a Reviva para fazer parte desse momento tão especial. ✨'
  doc.text(msgRodape, pw / 2, rodapeY + 21, { align: 'center' })

  doc.save(nomeArquivo(dados))
}
