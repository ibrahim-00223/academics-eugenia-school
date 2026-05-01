/**
 * Base API client for FastAPI backend.
 *
 * - Server components: pass `cookieHeader` (from next/headers) to forward auth cookies.
 * - Client components: use `apiFetch` directly — cookies are sent automatically via credentials:'include'.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(detail)
    this.name = 'ApiError'
  }
}

// ── Server-side fetch (forwards cookies from request) ─────────────────────────
export async function apiServer<T>(
  path: string,
  cookieHeader: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
      ...(options.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail ?? detail
    } catch {}
    throw new ApiError(res.status, detail)
  }

  // 204 No Content
  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}

// ── Client-side fetch (browser sends cookies automatically) ───────────────────
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body?.detail ?? detail
    } catch {}
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as unknown as T
  return res.json() as Promise<T>
}
