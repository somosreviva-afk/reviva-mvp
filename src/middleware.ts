import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isLoginPage = pathname === '/login'
  const isPublicPage = isLoginPage || pathname === '/'
    || pathname === '/auth/callback'                  // callback do magic link
    || pathname.startsWith('/enviar-fotos')
    || pathname.startsWith('/api/pedido/info')
    || pathname === '/api/fotos/signed-url'          // só upload de fotos é público
    || pathname.startsWith('/api/webhooks/')          // webhooks externos
    || pathname.startsWith('/api/nuvemshop/lgpd')    // LGPD Nuvemshop

  if (!