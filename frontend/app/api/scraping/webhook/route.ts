// Apify webhook — now points directly to the FastAPI backend.
// Configure Apify webhook URL to: https://your-backend.up.railway.app/api/scraping/apify-webhook
// This Next.js route is no longer used.
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { detail: 'Webhook Apify reçu par le backend FastAPI directement.' },
    { status: 410 },
  )
}
