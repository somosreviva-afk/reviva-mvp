import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Callback OAuth da Nuvemshop
// Após instalar o app, a Nuvemshop redireciona aqui com ?code=xxx&user_id=yyy
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('user_id') // store ID (pode vir aqui ou no token)

  if (!code) {
    return NextResponse.redirect(
      new URL('/configuracoes?nuvemshop=erro', req.url)
    )
  }

  const appId = process.env.NUVEMSHOP_APP_ID
  const clientSecret = process.env.NUVEMSHOP_CLIENT_SECRET

  if (!appId || !clientSecret) {
    return NextResponse.redirect(
      new URL('/configuracoes?nuvemshop=sem_credenciais', req.url)
    )
  }

  try {
    // Troca o code pelo access_token
    const tokenRes = await fetch('https://www.nuvemshop.com.br/apps/authorize/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Number(appId),
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
      }),
    })

    const tokenData = await tokenRes.json()
    console.log('Nuvemshop token response:', JSON.stringify(tokenData))
    const accessToken = tokenData.access_token
    const storeId = tokenData.user_id || userId

    if (!accessToken) {
      console.error('Sem access_token. Resposta:', JSON.stringify(tokenData))
      return NextResponse.redirect(
        new URL('/configuracoes?nuvemshop=token_erro', req.url)
      )
    }

    // Salva token no Supabase
    const supabase = createAdminClient()
    const { data: empresa } = await supabase
      .from('empresas')
      .select('id')
      .limit(1)
      .single()

    if (empresa) {
      await supabase
        .from('configuracoes_materiais')
        .update({
          nuvemshop_store_id: String(storeId),
          nuvemshop_access_token: accessToken,
        })
        .eq('empresa_id', empresa.id)

      // Registra o webhook de pedido pago
      await fetch(`https://api.tiendanube.com/v1/${storeId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authentication': `bearer ${accessToken}`,
          'User-Agent': `Reviva Integração (somosreviva@gmail.com)`,
        },
        body: JSON.stringify({
          event: 'order/paid',
          url: 'https://reviva-mvp.vercel.app/api/webhooks/nuvemshop',
        }),
      })
    }

    return NextResponse.redirect(
      new URL('/configuracoes?nuvemshop=conectado', req.url)
    )
  } catch (err) {
    console.error('Nuvemshop callback erro:', err)
    return NextResponse.redirect(
      new URL('/configuracoes?nuvemshop=erro', req.url)
    )
  }
}
