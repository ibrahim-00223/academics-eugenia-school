import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Wallet, TrendingUp, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const experienceBandLabels: Record<string, string> = {
  junior: 'Junior (0–2 ans)',
  mid:    'Confirmé (3–5 ans)',
  senior: 'Senior (6+ ans)',
}

export default async function SalaryPage() {
  const supabase = await createClient()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [{ data: clusters }, { data: simulations }] = await Promise.all([
    supabase.from('skill_clusters').select('*').order('name'),
    supabase
      .from('salary_simulations')
      .select('*, skill_clusters(name, color)')
      .eq('period_year', year)
      .eq('period_month', month)
      .order('p50_salary', { ascending: false }),
  ])

  const formatSalary = (val: number | null) =>
    val ? `${Math.round(val / 1000)}k€` : '—'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Simulateur de salaires</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Fourchettes salariales par cluster de compétences —{' '}
          {format(now, 'MMMM yyyy', { locale: fr })}
        </p>
      </div>

      {/* Clusters overview */}
      <div>
        <h2 className="text-base font-semibold mb-3">Clusters de compétences</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {clusters?.map((cluster) => (
            <Card key={cluster.id} className="border-border/50">
              <CardContent className="pt-4 pb-3">
                <div
                  className="w-3 h-3 rounded-full mb-2"
                  style={{ backgroundColor: cluster.color }}
                />
                <p className="text-sm font-medium leading-snug">{cluster.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cluster.skill_ids.length} compétence{cluster.skill_ids.length > 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Salary simulations */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">
            Simulation salaires — {format(now, 'MMMM yyyy', { locale: fr })}
          </CardTitle>
          <CardDescription>
            P25 / Médiane / P75 par cluster et niveau d&apos;expérience (CDI, France)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {simulations && simulations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Cluster</th>
                    <th className="text-left py-2 pr-4 text-xs font-medium text-muted-foreground">Profil</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">P25</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">Médiane</th>
                    <th className="text-right py-2 pr-4 text-xs font-medium text-muted-foreground">P75</th>
                    <th className="text-right py-2 text-xs font-medium text-muted-foreground">Fiabilité</th>
                  </tr>
                </thead>
                <tbody>
                  {simulations.map((sim) => {
                    const cluster = sim.skill_clusters as unknown as { name: string; color: string } | null
                    const isLowConfidence = (sim.confidence_score ?? 1) < 0.5
                    return (
                      <tr key={sim.id} className="border-b border-border/30 last:border-0 hover:bg-muted/30">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            {cluster && (
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: cluster.color }}
                              />
                            )}
                            <span className="font-medium">{cluster?.name ?? '—'}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground text-xs">
                          {sim.experience_band ? experienceBandLabels[sim.experience_band] : '—'}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-xs text-muted-foreground">
                          {formatSalary(sim.p25_salary)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono font-semibold">
                          {formatSalary(sim.p50_salary)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-xs text-muted-foreground">
                          {formatSalary(sim.p75_salary)}
                        </td>
                        <td className="py-3 text-right">
                          {isLowConfidence ? (
                            <div className="flex items-center justify-end gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-xs text-amber-500">
                                Faible ({sim.sample_size} pts)
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-emerald-500">
                              Bonne ({sim.sample_size} pts)
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Wallet className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Aucune simulation disponible pour ce mois</p>
              <p className="text-xs mt-1 max-w-sm mx-auto">
                Les simulations sont calculées automatiquement à partir des données
                salariales extraites des offres d&apos;emploi.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
