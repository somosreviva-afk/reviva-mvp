import { NextRequest, NextResponse } from 'next/server'

// Endpoint LGPD exigido pela Nuvemshop
// Recebe notificações de exclusão/dados de clientes
export async function POST(req: NextRequest) {
  // Por ser uso interno (app privado na nossa própria loja),
  // apenas confirmamos o recebimento
  return NextResponse.json({ ok: true }, { status: 200 })
}
