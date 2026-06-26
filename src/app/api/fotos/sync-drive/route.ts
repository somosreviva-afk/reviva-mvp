import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { google } from 'googleapis'

export const maxDuration = 60 // segundos — evita timeout no Vercel

function criarAuthDrive() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY
  if (!email || !key) return null

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

// Garante que o pedido tem pasta no Drive — cria se não tiver
async function garantirPastaDrive(supabase: any, drive: any, pedidoId: string) {
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('pasta_drive_id, numero, clientes(nome)')
    .eq('id', pedidoId)
    .single()

  if (!pedido) throw new Error('Pedido não encontrado')

  if (pedido.pasta_drive_id) return pedido.pasta_drive_id

  // Cria a pasta no Drive
  const pastaRaizId = process.env.GOOGLE_DRIVE_PASTA_ID
  if (!pastaRaizId) throw new Error('GOOGLE_DRIVE_PASTA_ID não configurado')

  const nomeCliente = (pedido.clientes as any)?.nome || 'Cliente'
  const nomePasta = `${nomeCliente} - Pedido #${pedido.numero}`

  const pasta = await drive.files.create({
    requestBody: {
      name: nomePasta,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [pastaRaizId],
    },
    fields: 'id,webViewLink',
  })

  const folderId = pasta.data.id!
  const link = pasta.data.webViewLink

  // Compartilha (apenas visualização — só a conta de serviço pode escrever)
  await drive.permissions.create({
    fileId: folderId,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  // Salva no pedido
  await supabase
    .from('pedidos')
    .update({ pasta_drive_id: folderId, link_pasta_drive: link })
    .eq('id', pedidoId)

  return folderId
}

// Copia fotos do Supabase Storage para a pasta Drive do pedido
export async function POST(req: NextRequest) {
  try {
    const { pedidoId } = await req.json()
    if (!pedidoId) return NextResponse.json({ error: 'pedidoId obrigatório' }, { status: 400 })

    const drive = criarAuthDrive()
    if (!drive) return NextResponse.json({ ok: true, aviso: 'Drive não configurado' })

    const supabase = createAdminClient()

    // Garante pasta no Drive (cria se não existir)
    const pastaDriveId = await garantirPastaDrive(supabase, drive, pedidoId)

    // Lista arquivos no Supabase Storage para esse pedido
    const { data: arquivos, error: listError } = await supabase.storage
      .from('fotos-clientes')
      .list(`pedidos/${pedidoId}`)

    if (listError) throw new Error(listError.message)
    if (!arquivos || arquivos.length === 0) {
      return NextResponse.json({ ok: true, aviso: 'Nenhum arquivo encontrado' })
    }

    // Para cada arquivo: baixa do Supabase e sobe pro Drive
    let copiados = 0
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
          parents: [pastaDriveId],
        },
        media: {
          mimeType: blob.type || 'image/jpeg',
          body: stream,
        },
        fields: 'id',
      })
      copiados++
    }

    return NextResponse.json({ ok: true, copiados })
  } catch (err: any) {
    console.error('Erro sync Drive:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
