import { cookies } from 'next/headers'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { apiServer } from '@/lib/api/client'
import type { SkillAggregate, SkillTaxonomy } from '@/lib/api/types'

const categoryColors: Record<string, string> = {
  technical: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  soft:      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  domain:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const categoryLabels: Record<string, string> = {
  technical: 'Technique',
  soft:      'Soft skill',
  domain:    'Domaine',
}

export default async function SkillsPage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ')

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [topSkills, taxonomy] = await Promise.all([
    apiServer<SkillAggregate[]>(
      `/api/skills/aggregates?year=${year}&month=${month}&limit=20`,
      cookieHeader,
    ).catch(() => []),
    apiServer<SkillTaxonomy[]>('/api/skills/taxonomy', cookieHeader).catch(() => []),
  ])

  const maxCount = (topSkills as SkillAggregate[])[0]?.job_count ?? 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compétences</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Analyse des compétences tendances du marché — {format(now, 'MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(categoryLabels).map(([cat, label]) => {
          const count = (taxonomy as SkillTaxonomy[]).filter((s) => s.category === cat).length
          return (
            <Card key={cat} className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{label}s</p>
                <p className="text-xl font-bold mt-0.5">{count}</p>
                <span className={`text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block ${categoryColors[cat]}`}>
                  {cat}
                </span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Top skills */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">
            Top 20 compétences — {format(now, 'MMMM yyyy', { locale: fr })}
          </CardTitle>
          <CardDescription>
            Classées par nombre d&apos;offres d&apos;emploi mentionnant la compétence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(topSkills as SkillAggregate[]).length > 0 ? (
            <div className="space-y-2.5">
              {(topSkills as SkillAggregate[]).map((item, i) => {
                const pct = Math.round((item.job_count / maxCount) * 100)
                return (
                  <div key={item.skill_id} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.skill_name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoryColors[item.category] ?? ''}`}>
                            {categoryLabels[item.category] ?? item.category}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                          {item.job_count} offres
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune donnée pour ce mois</p>
              <p className="text-xs mt-1">Lancez un scraping puis l&apos;extraction IA pour voir les tendances.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
