import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Endpoint público — retorna apenas info básica do pedido para a página de upload
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id, numero, status, clientes(nome)')
      .eq('id', params.id)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      id: pedido.id,
      numero: pedido.numero,
      nomeCliente: (pedido.clientes as any)?.nome || 'Cliente',
      status: pedido.status,
    })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
