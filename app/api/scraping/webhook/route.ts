import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

interface ApifyWebhookPayload {
  jobId: string
  runId: string
  status: 'SUCCEEDED' | 'FAILED' | string
  datasetId: string
}

interface ApifyJobItem {
  id?: string
  jobUrl?: string
  title?: string
  companyName?: string
  location?: string
  employmentType?: string
  salaryText?: string
  description?: string
  postedAt?: string
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const webhookSecret = process.env.APIFY_WEBHOOK_SECRET
  const authHeader = request.headers.get('authorization')

  if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload: ApifyWebhookPayload = await request.json()
  const { jobId, runId, status, datasetId } = payload

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 })
  }

  // Use service role for webhook (no user session)
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll() {},
      },
    }
  )

  if (status === 'FAILED') {
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'failed',
        error_message: `Apify run ${runId} failed`,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return NextResponse.json({ received: true })
  }

  if (status !== 'SUCCEEDED') {
    return NextResponse.json({ received: true })
  }

  // Get source_id from job
  const { data: job } = await supabase
    .from('scraping_jobs')
    .select('source_id')
    .eq('id', jobId)
    .single()

  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 })
  }

  // Fetch items from Apify dataset
  const apifyToken = process.env.APIFY_API_TOKEN!
  const datasetRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}&limit=500`,
    { headers: { Accept: 'application/json' } }
  )

  if (!datasetRes.ok) {
    await supabase
      .from('scraping_jobs')
      .update({ status: 'failed', error_message: 'Failed to fetch Apify dataset' })
      .eq('id', jobId)
    return NextResponse.json({ error: 'Dataset fetch failed' }, { status: 500 })
  }

  const items: ApifyJobItem[] = await datasetRes.json()

  // Insert raw job posts (batch insert, skip duplicates)
  if (items.length > 0) {
    const rows = items.map((item) => ({
      scraping_job_id: jobId,
      source_id: job.source_id,
      external_id: item.id ?? null,
      url: item.jobUrl ?? null,
      title: item.title ?? null,
      company: item.companyName ?? null,
      location: item.location ?? null,
      contract_type: item.employmentType ?? null,
      salary_raw: item.salaryText ?? null,
      description: item.description ?? null,
      posted_at: item.postedAt ?? null,
      is_processed: false,
    }))

    // Insert in chunks of 100 to avoid payload limits
    const chunkSize = 100
    let totalInserted = 0

    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { data } = await supabase
        .from('raw_job_posts')
        .upsert(chunk, { onConflict: 'source_id,external_id', ignoreDuplicates: true })
        .select('id')
      totalInserted += data?.length ?? 0
    }

    // Update job as completed
    await supabase
      .from('scraping_jobs')
      .update({
        status: 'completed',
        items_scraped: items.length,
        completed_at: new Date().toISOString(),
        metadata: { apify_run_id: runId, dataset_id: datasetId },
      })
      .eq('id', jobId)

    // Update last_successful_scrape_at on source
    await supabase
      .from('scraping_sources')
      .update({ last_successful_scrape_at: new Date().toISOString() })
      .eq('id', job.source_id)
  }

  return NextResponse.json({ received: true, itemsProcessed: items.length })
}
