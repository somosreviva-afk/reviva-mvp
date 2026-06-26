import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'

// Copia fotos do Supabase Storage para a pasta Drive do pedido
export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json()
    if (!pedidoId) return NextResponse.json({ error: 'pedidoId obrigatório' }, { status: 400 })

    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    const key = process.env.GOOGLE_PRIVATE_KEY
    if (!email || !key) return NextResponse.json({ ok: true, aviso: 'Drive não configurado' })

    const supabase = createAdminClient()

    // Busca pasta_drive_id do pedido
    const { data: pedido } = await supabase
      .from('pedidos')
      .select('pasta_drive_id')
      .eq('id', pedidoId)
      .single()

    if (!pedido?.pasta_drive_id) {
      return NextResponse.json({ ok: true, aviso: 'Pedido sem pasta Drive' })
    }

    // Lista arquivos no Supabase Storage para esse pedido
    const { data: arquivos, error: listError } = await supabase.storage
      .from('fotos-clientes')
      .list(`pedidos/${pedidoId}`)

    if (listError) throw new Error(listError.message)
    if (!arquivos || arquivos.length === 0) return NextResponse.json({ ok: true, aviso: 'Nenhum arquivo encontrado' })

    // Configura Drive
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    })
    const drive = google.drive({ version: 'v3', auth })

    // Para cada arquivo: baixa do Supabase e sobe pro Drive
    for (const arquivo of arquivos) {
      const path = `pedidos/${pedidoId}/${arquivo.name}`

      const { data: blob, error: dlError } = await supabase.storage
        .from('fotos-clientes')
        .download(path)

      if (dlError || !blob) continue

      const buffer = Buffer.from(await blob.arrayBuffer())
      const { Readable } = await import('stream')
      const stream = Readable.from(buffer)

      await drive.files.create({
        requestBody: {
          name: arquivo.name,
          parents: [pedido.pasta_drive_id],
        },
        media: {
          mimeType: blob.type || 'image/jpeg',
          body: stream,
        },
        fields: 'id',
      })
    }

    return NextResponse.json({ ok: true, copiados: arquivos.length })
  } catch (err: any) {
    console.error('Erro sync Drive:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
