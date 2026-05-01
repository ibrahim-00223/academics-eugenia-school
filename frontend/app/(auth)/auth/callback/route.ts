// OAuth callback is now handled entirely by FastAPI at /api/auth/google/callback
// FastAPI redirects to /dashboard after setting JWT cookies.
// This route should never be reached.
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.redirect(new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'))
}
