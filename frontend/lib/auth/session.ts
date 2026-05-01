/**
 * Server-side helper — fetch the current user from FastAPI.
 * Must be called in Server Components or Route Handlers only.
 */
import { cookies } from 'next/headers'
import { apiServer, ApiError } from '@/lib/api/client'
import type { User } from '@/lib/api/types'

export async function getServerSession(): Promise<User | null> {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')

  try {
    const user = await apiServer<User>('/api/auth/me', cookieHeader)
    return user
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    // Network errors etc. — treat as unauthenticated
    return null
  }
}
