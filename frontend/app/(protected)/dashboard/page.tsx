import { cookies } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Database, FileText, BookOpen, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { format, subMonths } from 'date-fns'
import { fr } from 'date-fns/locale'
import { apiServer } from '@/lib/api/client'
import type {
  RawJobPost,
  SkillTaxonomy,
  Program,
  SkillAggregate,
  ScrapingSource,
  MonthlyReport,
} from '@/lib/api/types'

async function getCookieHeader() {
  const cookieStore = await cookies()
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ')
}

export default async function DashboardPage() {
  const cookieHeader = await getCookieHeader()
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Fetch all data in parallel — gracefully handle failures
  const [
    rawPosts,
    skills,
    programs,
    topSkills,
    recentPosts,
    sources,
    reports,
  ] = await Promise.all([
    apiServer<RawJobPost[]>('/api/scraping/raw-posts?limit=1', cookieHeader).catch(() => []),
    apiServer<SkillTaxonomy[]>('/api/skills/taxonomy', cookieHeader).catch(() => []),
    apiServer<Program[]>('/api/programs', cookieHeader).catch(() => []),
    apiServer<SkillAggregate[]>(
      `/api/skills/aggregates?year=${currentYear}&month=${currentMonth}&limit=5`,
      cookieHeader,
    ).catch(() => []),
    apiServer<RawJobPost[]>('/api/scraping/raw-posts?limit=5', cookieHeader).catch(() => []),
    apiServer<ScrapingSource[]>('/api/scraping/sources', cookieHeader).catch(() => []),
    apiServer<MonthlyReport[]>('/api/reports', cookieHeader).catch(() => []),
  ])

  const latestReport = (reports as MonthlyReport[])[0] ?? null
  const activePrograms = (programs as Program[]).filter((p) => p.is_active)

  // Check for stale sources (no scrape in 7+ days)
  const staleSources = (sources as ScrapingSource[]).filter((s) => {
    if (!s.last_successful_scrape_at) return s.is_active
    const daysSince =
      (now.getTime() - new Date(s.last_successful_scrape_at).getTime()) /
      (1000 * 60 * 60 * 24)
    return daysSince > 7 && s.is_active
  })

  const statsCards = [
    {
      title: 'Offres scrapées',
      value: (rawPosts as RawJobPost[]).length > 0
        ? '—'
        : '0',
      description: 'Total cumulé',
      icon: Database,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Compétences indexées',
      value: (skills as SkillTaxonomy[]).length.toLocaleString('fr-FR'),
      description: 'Dans la taxonomie',
      icon: TrendingUp,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      title: 'Programmes actifs',
      value: activePrograms.length.toLocaleString('fr-FR'),
      description: 'Bachelor & Master',
      icon: BookOpen,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      title: 'Dernier rapport',
      value: latestReport?.generated_at
        ? format(new Date(latestReport.generated_at), 'dd MMM yyyy', { locale: fr })
        : 'Aucun',
      description: latestReport ? `${latestReport.period_month}/${latestReport.period_year}` : 'Pas encore généré',
      icon: FileText,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Vue d&apos;ensemble —{' '}
          {format(now, 'MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Stale source alert */}
      {staleSources.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Sources de scraping inactives</p>
            <p className="text-xs mt-0.5 text-amber-600/80 dark:text-amber-400/80">
              {staleSources.map((s) => s.name).join(', ')} n&apos;ont pas été
              mises à jour depuis plus de 7 jours.
            </p>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title} className="border-border/50">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                      {stat.title}
                    </p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${stat.bg}`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Skills this month */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Top compétences — {format(now, 'MMMM', { locale: fr })}
            </CardTitle>
            <CardDescription>
              Compétences les plus demandées dans les offres d&apos;emploi ce mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(topSkills as SkillAggregate[]).length > 0 ? (
              <div className="space-y-3">
                {(topSkills as SkillAggregate[]).map((item, i) => {
                  const maxCount = (topSkills as SkillAggregate[])[0]?.job_count ?? 1
                  const pct = Math.round((item.job_count / maxCount) * 100)
                  return (
                    <div key={item.skill_id} className="flex items-center gap-3">
                      <span className="text-xs font-mono text-muted-foreground w-4">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">
                            {item.skill_name}
                          </span>
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {item.job_count} offres
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Aucune donnée pour ce mois.</p>
                <p className="text-xs mt-1">
                  Lancez un scraping puis l&apos;extraction IA.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scraping sources status */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sources de données</CardTitle>
            <CardDescription>
              État des sources de scraping configurées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(sources as ScrapingSource[]).length > 0 ? (
              <div className="space-y-2">
                {(sources as ScrapingSource[]).map((source) => {
                  const isStale = staleSources.some((s) => s.id === source.id)
                  const lastScrape = source.last_successful_scrape_at
                    ? format(
                        new Date(source.last_successful_scrape_at),
                        'dd MMM à HH:mm',
                        { locale: fr }
                      )
                    : 'Jamais'
                  return (
                    <div
                      key={source.id}
                      className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        {isStale ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        <span className="text-sm font-medium capitalize">
                          {source.name.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {lastScrape}
                        </span>
                        <Badge
                          variant={source.is_active ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {source.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Aucune source configurée.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent job posts */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dernières offres scrapées</CardTitle>
            <CardDescription>
              Les 5 offres d&apos;emploi les plus récemment collectées
            </CardDescription>
          </CardHeader>
          <CardContent>
            {(recentPosts as RawJobPost[]).length > 0 ? (
              <div className="divide-y divide-border/30">
                {(recentPosts as RawJobPost[]).map((job) => (
                  <div
                    key={job.id}
                    className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {job.title ?? 'Sans titre'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {job.company ?? 'Entreprise inconnue'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-4 flex-shrink-0">
                      {format(new Date(job.scraped_at), 'dd MMM', { locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Aucune offre scrapée pour l&apos;instant.</p>
                <p className="text-xs mt-1">
                  Allez dans Scraping pour lancer votre première collecte.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
