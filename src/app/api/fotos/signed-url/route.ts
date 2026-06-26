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
