import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // 1. Inizializza la risposta
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Crea il client usando LE VARIABILI D'AMBIENTE (IMPORTANTE!)
  // Non scrivere le chiavi a mano qui, altrimenti i cookie non combaciano con il login
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Aggiorna i cookie sia nella richiesta che nella risposta
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Controlla l'utente (questo aggiorna anche la sessione se necessario)
  const { data: { user } } = await supabase.auth.getUser()

  // --- REGOLE DI PROTEZIONE ---

  // A) Se NON sei loggato e cerchi di entrare in /admin -> VAI AL LOGIN
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // B) Se sei GIA' loggato e provi ad andare al login -> VAI ALLA DASHBOARD
  if (user && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/dashboard'
    return NextResponse.redirect(url)
  }

  // C) Se sei sulla home (/) -> VAI AL LOGIN (o dashboard se loggato)
  if (request.nextUrl.pathname === '/') {
    const url = request.nextUrl.clone()
    if (user) {
        url.pathname = '/admin/dashboard'
    } else {
        url.pathname = '/login'
    }
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: [
    // Escludi file statici, immagini e le pagine di auth/login
    '/((?!_next/static|_next/image|favicon.ico|live|login|auth|forgot-password|update-password).*)',
  ],
}