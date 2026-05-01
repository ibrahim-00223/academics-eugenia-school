// Moved to FastAPI backend — POST /api/scraping/trigger
// Frontend now calls FastAPI directly via apiFetch().
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { detail: 'Cette route a été migrée vers le backend FastAPI.' },
    { status: 410 },
  )
}
