import { createClient } from '@/lib/supabase/server'
import { NextResponse, type NextRequest } from 'next/server'
import { z } from 'zod'

const triggerSchema = z.object({
  sourceId: z.string().uuid(),
  maxItems: z.number().int().positive().max(500).optional().default(200),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // Verify auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Verify role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'viewer') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
  }

  // Parse body
  const body = await request.json().catch(() => ({}))
  const parsed = triggerSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 })
  }

  const { sourceId, maxItems } = parsed.data

  // Get source config
  const { data: source, error: sourceError } = await supabase
    .from('scraping_sources')
    .select('*')
    .eq('id', sourceId)
    .single()

  if (sourceError || !source) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  if (!source.is_active) {
    return NextResponse.json({ error: 'Source is inactive' }, { status: 400 })
  }

  // Create scraping job
  const { data: job, error: jobError } = await supabase
    .from('scraping_jobs')
    .insert({
      source_id: sourceId,
      status: 'pending',
      triggered_by: 'manual',
      triggered_by_user: user.id,
      metadata: { max_items: maxItems },
    })
    .select()
    .single()

  if (jobError || !job) {
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }

  // Dispatch to appropriate scraper based on source name
  try {
    if (source.name === 'linkedin') {
      await triggerLinkedInScrape(job.id, source.config as Record<string, unknown>, maxItems)
    } else if (source.name === 'indeed' || source.name === 'welcome_to_the_jungle') {
      await triggerPlaywrightScrape(job.id, source.name, source.config as Record<string, unknown>)
    } else if (source.source_type === 'podcast') {
      await triggerPodcastFetch(job.id, source.config as Record<string, unknown>)
    }
  } catch (err) {
    // Update job to failed
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        completed_at: new Date().toISOString(),
      })
      .eq('id', job.id)

    return NextResponse.json({ error: 'Failed to start scraper', jobId: job.id }, { status: 500 })
  }

  return NextResponse.json({ success: true, jobId: job.id, status: 'pending' })
}

async function triggerLinkedInScrape(
  jobId: string,
  config: Record<string, unknown>,
  maxItems: number
) {
  // Apify is async — the webhook at /api/scraping/webhook will update the job
  const apifyToken = process.env.APIFY_API_TOKEN
  if (!apifyToken) {
    throw new Error('APIFY_API_TOKEN not configured')
  }

  const actorId = (config.apify_actor_id as string) ?? 'curious_coder/linkedin-jobs-scraper'
  const searchUrls = (config.default_search_urls as string[]) ?? []

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/scraping/webhook`

  const response = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(actorId)}/runs?token=${apifyToken}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startUrls: searchUrls.map((url) => ({ url })),
        maxItems,
        webhooks: [
          {
            eventTypes: ['ACTOR.RUN.SUCCEEDED', 'ACTOR.RUN.FAILED'],
            requestUrl: webhookUrl,
            payloadTemplate: JSON.stringify({
              jobId,
              runId: '{{runId}}',
              status: '{{status}}',
              datasetId: '{{defaultDatasetId}}',
            }),
          },
        ],
      }),
    }
  )

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Apify error: ${err}`)
  }

  const run = await response.json()

  // Store Apify run ID in job metadata
  const { createClient: createAdminClient } = await import('@/lib/supabase/server')
  const supabase = await createAdminClient()
  await supabase
    .from('scraping_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
      metadata: { apify_run_id: run.data?.id },
    })
    .eq('id', jobId)
}

async function triggerPlaywrightScrape(
  jobId: string,
  sourceName: string,
  config: Record<string, unknown>
) {
  // Invoke Supabase Edge Function for Playwright scraping
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const response = await fetch(
    `${supabaseUrl}/functions/v1/scrape-${sourceName.replace(/_/g, '-')}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ jobId, config }),
    }
  )

  if (!response.ok) {
    throw new Error(`Edge function error: ${await response.text()}`)
  }
}

async function triggerPodcastFetch(
  jobId: string,
  config: Record<string, unknown>
) {
  // Invoke Supabase Edge Function for podcast RSS + Whisper
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const response = await fetch(
    `${supabaseUrl}/functions/v1/scrape-podcast`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ jobId, config }),
    }
  )

  if (!response.ok) {
    throw new Error(`Podcast scraper error: ${await response.text()}`)
  }
}
