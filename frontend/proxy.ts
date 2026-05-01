import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public paths that don't require auth
  const publicPaths = ['/login']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  // Check for JWT access_token cookie (set by FastAPI after Google OAuth)
  const hasToken = request.cookies.has('access_token')

  // ── Not authenticated ──────────────────────────────────────
  if (!hasToken && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Already logged in, visiting login page ─────────────────
  if (hasToken && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
