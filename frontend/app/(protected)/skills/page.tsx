import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const categoryColors: Record<string, string> = {
  language:  'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  technical: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  tool:      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  soft:      'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  domain:    'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const categoryLabels: Record<string, string> = {
  language:  'Langage',
  technical: 'Technique',
  tool:      'Outil',
  soft:      'Soft skill',
  domain:    'Domaine',
}

export default async function SkillsPage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [{ data: topSkills }, { count: totalSkills }, { data: taxonomy }] = await Promise.all([
    supabase
      .from('skill_aggregates')
      .select('*, skill_taxonomy(name, category)')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('job_count', { ascending: false })
      .limit(20),
    supabase.from('skill_taxonomy').select('*', { count: 'exact', head: true }),
    supabase
      .from('skill_taxonomy')
      .select('*')
      .order('name')
      .limit(50),
  ])

  const maxCount = topSkills?.[0]?.job_count ?? 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Compétences</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Analyse des compétences tendances du marché — {format(now, 'MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(categoryLabels).map(([cat, label]) => {
          const count = taxonomy?.filter((s) => s.category === cat).length ?? 0
          return (
            <Card key={cat} className="border-border/50">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{label}s</p>
                <p className="text-xl font-bold mt-0.5">{count}</p>
                <Badge className={`text-xs mt-1 ${categoryColors[cat]} border-0`}>
                  {cat}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Top skills chart */}
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
          {topSkills && topSkills.length > 0 ? (
            <div className="space-y-2.5">
              {topSkills.map((item, i) => {
                const skill = item.skill_taxonomy as unknown as { name: string; category: string } | null
                const skillName = skill?.name ?? item.id
                const category = skill?.category ?? 'technical'
                const pct = Math.round((item.job_count / maxCount) * 100)

                return (
                  <div key={item.id} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-muted-foreground w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{skillName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${categoryColors[category]}`}>
                            {categoryLabels[category]}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground ml-3 flex-shrink-0">
                          {item.job_count} offres
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune donnée d&apos;agrégation pour ce mois</p>
              <p className="text-xs mt-1">
                Lancez un scraping puis l&apos;extraction IA pour voir les tendances.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
