/**
 * Eugenia Academics — Cron Worker
 * Runs as a separate Railway service alongside the Next.js app.
 *
 * Railway setup:
 *   - Service name: cron-worker
 *   - Start command: npx tsx workers/cron.ts
 *   - Same environment variables as the main app
 *
 * Schedules (all times UTC):
 *   - LinkedIn scraping :  Mon/Wed/Fri at 06:00
 *   - Indeed scraping   :  Mon/Wed/Fri at 07:00
 *   - WTTJ scraping     :  Mon/Wed/Fri at 08:00
 *   - Podcasts          :  Tue/Fri     at 09:00
 *   - AI extraction     :  Tue/Fri     at 10:00
 *   - Monthly report    :  1st of month at 00:00
 */

import cron from 'node-cron'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET ?? ''

if (!CRON_SECRET) {
  console.warn('[cron] CRON_SECRET not set — requests will be rejected by the app')
}

async function triggerCron(source: string) {
  const url = `${APP_URL}/api/scraping/cron?source=${source}`
  console.log(`[cron] → ${source}`)
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error(`[cron] ✗ ${source} — HTTP ${res.status}:`, data)
    } else {
      console.log(`[cron] ✓ ${source} — jobId: ${data.jobId ?? 'n/a'}`)
    }
  } catch (err) {
    console.error(`[cron] ✗ ${source} — Network error:`, err)
  }
}

async function triggerAIExtraction() {
  const url = `${APP_URL}/api/ai/extract-skills`
  console.log('[cron] → AI extraction')
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
    })
    const data = await res.json().catch(() => ({}))
    console.log(`[cron] ✓ AI extraction — status: ${data.status ?? 'unknown'}`)
  } catch (err) {
    console.error('[cron] ✗ AI extraction —', err)
  }
}

async function triggerMonthlyReport() {
  const now = new Date()
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1)
  const url = `${APP_URL}/api/ai/generate-report`
  console.log('[cron] → Monthly report', prevMonth.toISOString().slice(0, 7))
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({
        year: prevMonth.getFullYear(),
        month: prevMonth.getMonth() + 1,
      }),
    })
    const data = await res.json().catch(() => ({}))
    console.log(`[cron] ✓ Monthly report — reportId: ${data.reportId ?? 'n/a'}`)
  } catch (err) {
    console.error('[cron] ✗ Monthly report —', err)
  }
}

console.log('[cron] Worker started. APP_URL:', APP_URL)

// LinkedIn — Mon/Wed/Fri at 06:00 UTC
cron.schedule('0 6 * * 1,3,5', () => triggerCron('linkedin'), { timezone: 'UTC' })

// Indeed — Mon/Wed/Fri at 07:00 UTC
cron.schedule('0 7 * * 1,3,5', () => triggerCron('indeed'), { timezone: 'UTC' })

// Welcome to the Jungle — Mon/Wed/Fri at 08:00 UTC
cron.schedule('0 8 * * 1,3,5', () => triggerCron('welcome_to_the_jungle'), { timezone: 'UTC' })

// Podcasts — Tue/Fri at 09:00 UTC
cron.schedule('0 9 * * 2,5', () => {
  triggerCron('podcast_ifttd')
  triggerCron('podcast_artisan_dev')
}, { timezone: 'UTC' })

// AI skill extraction — Tue/Fri at 10:00 UTC
cron.schedule('0 10 * * 2,5', () => triggerAIExtraction(), { timezone: 'UTC' })

// Monthly report — 1st of each month at 00:00 UTC
cron.schedule('0 0 1 * *', () => triggerMonthlyReport(), { timezone: 'UTC' })

// Keep process alive
process.on('SIGTERM', () => {
  console.log('[cron] SIGTERM received, shutting down gracefully')
  process.exit(0)
})
