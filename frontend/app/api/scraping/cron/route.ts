// Moved to FastAPI backend — APScheduler handles all cron jobs.
// See backend/workers/ for the cron configuration.
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { detail: 'Les crons sont gérés par APScheduler dans le backend FastAPI.' },
    { status: 410 },
  )
}
