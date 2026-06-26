'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const INATIVIDADE_MS = 30 * 60 * 1000 // 30 minutos

export function InactivityGuard() {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function logout() {
      await supabase.auth.signOut()
      router.push('/login')
    }

    function resetTimer() {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(logout, INATIVIDADE_MS)
    }

    const eventos = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    eventos.forEach(ev => window.addEventListener(ev, resetTimer, { passive: true }))

    resetTimer() // inicia o timer ao montar

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      eventos.forEach(ev => window.removeEventListener(ev, resetTimer))
    }
  }, [router])

  return null
}
