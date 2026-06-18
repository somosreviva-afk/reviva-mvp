import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function POST(req: NextRequest) {
  const { nomeCliente, numeroPedido } = await req.json()

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_PRIVATE_KEY
  const pastaId = process.env.GOOGLE_DRIVE_PASTA_ID

  // Se credenciais não configuradas, retorna sem erro
  if (!email || !key || !pastaId) {
    return NextResponse.json({ error: 'not_configured' })
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/drive'],
    })

    const drive = google.drive({ version: 'v3', auth })

    const nomePasta = `${nomeCliente} - Pedido #${numeroPedido}`

    // Cria a pasta dentro de Reviva/Pedidos
    const pasta = await drive.files.create({
      requestBody: {
        name: nomePasta,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [pastaId],
      },
      fields: 'id',
    })

    const folderId = pasta.data.id!

    // Compartilha com qualquer pessoa que tenha o link (pode enviar fotos)
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'writer',
        type: 'anyone',
      },
    })

    // Pega o link compartilhável
    const arquivo = await drive.files.get({
      fileId: folderId,
      fields: 'webViewLink',
    })

    return NextResponse.json({
      folderId,
      link: arquivo.data.webViewLink,
    })
  } catch (err: any) {
    console.error('Erro Google Drive:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
