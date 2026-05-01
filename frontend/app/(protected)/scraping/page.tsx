import { cookies } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { apiServer } from '@/lib/api/client'
import { TriggerScrapingButton } from '@/components/scraping/TriggerScrapingButton'
import type { ScrapingSource, ScrapingJob } from '@/lib/api/types'

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  completed:    { label: 'Terminé',    color: 'bg-emerald-500/10 text-emerald-500', icon: CheckCircle2 },
  running:      { label: 'En cours',   color: 'bg-blue-500/10 text-blue-500',       icon: Clock },
  pending:      { label: 'En attente', color: 'bg-slate-500/10 text-slate-500',     icon: Clock },
  failed:       { label: 'Échoué',     color: 'bg-red-500/10 text-red-500',         icon: XCircle },
  rate_limited: { label: 'Limité',     color: 'bg-amber-500/10 text-amber-500',     icon: AlertTriangle },
}

export default async function ScrapingPage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ')

  const [sources, recentJobs] = await Promise.all([
    apiServer<ScrapingSource[]>('/api/scraping/sources', cookieHeader).catch(() => []),
    apiServer<ScrapingJob[]>('/api/scraping/jobs?limit=20', cookieHeader).catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Scraping</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gérez les sources de données et suivez les collectes
          </p>
        </div>
      </div>

      {/* Sources */}
      <div>
        <h2 className="text-base font-semibold mb-3">Sources configurées</h2>
        {(sources as ScrapingSource[]).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {(sources as ScrapingSource[]).map((source) => {
              const lastScrape = source.last_successful_scrape_at
                ? format(new Date(source.last_successful_scrape_at), 'dd MMM à HH:mm', { locale: fr })
                : 'Jamais'
              const isStale =
                !source.last_successful_scrape_at ||
                Date.now() - new Date(source.last_successful_scrape_at).getTime() >
                  7 * 24 * 60 * 60 * 1000

              return (
                <Card key={source.id} className="border-border/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-sm font-semibold capitalize">
                          {source.name.replace(/_/g, ' ')}
                        </CardTitle>
                        <CardDescription className="text-xs mt-0.5">
                          {source.source_type === 'job_board'
                            ? "Offres d'emploi"
                            : source.source_type === 'podcast'
                              ? 'Podcast'
                              : 'Flux RSS'}
                        </CardDescription>
                      </div>
                      <Badge
                        variant={source.is_active ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {source.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {isStale && source.is_active ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                        Dernier : {lastScrape}
                      </div>
                      <TriggerScrapingButton
                        sourceId={source.id}
                        sourceName={source.name}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="text-center py-12 text-muted-foreground text-sm">
              <p>Aucune source configurée.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent jobs */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Historique des collectes</CardTitle>
          <CardDescription>20 derniers jobs de scraping</CardDescription>
        </CardHeader>
        <CardContent>
          {(recentJobs as ScrapingJob[]).length > 0 ? (
            <div className="divide-y divide-border/30">
              {(recentJobs as ScrapingJob[]).map((job) => {
                const cfg = statusConfig[job.status] ?? statusConfig.pending
                const Icon = cfg.icon
                return (
                  <div
                    key={job.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-1.5 rounded-lg ${cfg.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">
                          {job.source_id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {job.items_scraped} items ·{' '}
                          {job.triggered_by === 'cron' ? 'Automatique' : 'Manuel'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs text-muted-foreground hidden sm:block">
                        {format(new Date(job.created_at), 'dd MMM HH:mm', { locale: fr })}
                      </span>
                      <Badge className={`text-xs ${cfg.color} border-0`}>
                        {cfg.label}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Aucun job de scraping pour l&apos;instant.</p>
              <p className="text-xs mt-1">
                Cliquez sur &quot;Lancer&quot; sur une source pour démarrer.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
