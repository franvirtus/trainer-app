import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // 1. Inizializziamo la risposta (passiamo la richiesta per mantenere gli header)
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Creiamo il client Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Qui sta la magia: aggiorniamo sia la richiesta che la risposta
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

  // 3. Controlliamo l'utente
  // ATTENZIONE: getUser è più sicuro di getSession per il middleware
  const { data: { user } } = await supabase.auth.getUser()

  // 4. Regole di protezione
  
  // A) Se sei loggato e provi ad andare al login -> vai in dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // B) Se NON sei loggato e provi ad andare in /admin -> vai al login
  if (!user && request.nextUrl.pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // C) Se sei nella home (/) -> vai al login (o dashboard se loggato)
  if (request.nextUrl.pathname === '/') {
    if (user) {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    }
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|live|auth|forgot-password|update-password).*)',
  ],
}