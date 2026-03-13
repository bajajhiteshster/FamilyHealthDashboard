// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
      getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
      cookiesToSet.forEach(({ name, value }) =>
      request.cookies.set(name, value)
    )
    supabaseResponse = NextResponse.next({ request })
    cookiesToSet.forEach(({ name, value, options }) =>
      supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
    )
  },
},
    }
  )

  // IMPORTANT: Use getUser() not getSession() - getSession() hits the network
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Redirect unauthenticated users to /auth
  if (!user && pathname !== '/auth') {
    return NextResponse.redirect(new URL('/auth', request.url))
  }

  // Redirect authenticated users away from /auth
  if (user && pathname === '/auth') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
}