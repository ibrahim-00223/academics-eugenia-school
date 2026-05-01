import { NextResponse, type NextRequest } from 'next/server'

/**
 * Vercel Cron endpoint — triggers scheduled scraping jobs.
 * Called by Vercel Cron according to vercel.json schedule.
 *
 * Security: Vercel sets Authorization header with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  // Verify Vercel cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const source = request.nextUrl.searchParams.get('source')
  if (!source) {
    return NextResponse.json({ error: 'Missing source parameter' }, { status: 400 })
  }

  // Trigger via internal API
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`

  // Find source ID by name
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  const { data: sourceRecord } = await supabase
    .from('scraping_sources')
    .select('id, is_active')
    .eq('name', source)
    .single()

  if (!sourceRecord || !sourceRecord.is_active) {
    return NextResponse.json({ skipped: true, reason: 'Source not found or inactive' })
  }

  // Create a pending job
  const { data: job, error } = await supabase
    .from('scraping_jobs')
    .insert({
      source_id: sourceRecord.id,
      status: 'pending',
      triggered_by: 'cron',
      metadata: { cron_source: source },
    })
    .select()
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // Trigger the actual scraper via the trigger endpoint
  const triggerRes = await fetch(`${appUrl}/api/scraping/trigger`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Use service role to bypass auth check for cron
      'x-cron-secret': process.env.CRON_SECRET ?? '',
    },
    body: JSON.stringify({ sourceId: sourceRecord.id }),
  })

  return NextResponse.json({
    scheduled: true,
    source,
    jobId: job.id,
    triggerStatus: triggerRes.status,
  })
}
