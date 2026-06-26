import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Gera URL assinada para upload direto — sem precisar de RLS
export async function POST(req: NextRequest) {
  try {
    const { pedidoId, fileName } = await req.json()
    if (!pedidoId || !fileName) {
      return NextResponse.json({ error: 'pedidoId e fileName obrigatórios' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Valida que o pedido existe — impede upload para pedidos falsos
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('id')
      .eq('id', pedidoId)
      .single()

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const ext = (fileName.split('.').pop() || 'jpg').toLowerCase()
    const path = `pedidos/${pedidoId}/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('fotos-clientes')
      .createSignedUploadUrl(path)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, path })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
