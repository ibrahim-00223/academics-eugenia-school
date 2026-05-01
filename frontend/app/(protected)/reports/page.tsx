import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Download, Plus, BarChart3, TrendingUp, BookOpen } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const reportTypeConfig = {
  monthly_skills:    { label: 'Compétences', icon: TrendingUp, color: 'bg-indigo-500/10 text-indigo-500' },
  salary_simulation: { label: 'Salaires', icon: BarChart3, color: 'bg-emerald-500/10 text-emerald-500' },
  program_alignment: { label: 'Alignement', icon: BookOpen, color: 'bg-purple-500/10 text-purple-500' },
}

export default async function ReportsPage() {
  const supabase = await createClient()

  const { data: reports } = await supabase
    .from('monthly_reports')
    .select('*')
    .order('period_year', { ascending: false })
    .order('period_month', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rapports</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Rapports mensuels de veille marché et d&apos;alignement programme
          </p>
        </div>
        <Button size="sm" className="gap-1.5" variant="default">
          <Plus className="w-4 h-4" />
          Générer un rapport
        </Button>
      </div>

      {reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reports.map((report) => {
            const cfg = reportTypeConfig[report.report_type] ?? reportTypeConfig.monthly_skills
            const Icon = cfg.icon
            const periodLabel = format(
              new Date(report.period_year, report.period_month - 1),
              'MMMM yyyy',
              { locale: fr }
            )

            return (
              <Card key={report.id} className="border-border/50 hover:border-border transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`p-2 rounded-xl ${cfg.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {cfg.label}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-3">
                    {report.title}
                  </CardTitle>
                  <CardDescription className="text-xs capitalize">
                    {periodLabel}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(report.generated_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </span>
                    {report.pdf_storage_path && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1.5">
                        <Download className="w-3 h-3" />
                        PDF
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="border-border/50 border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Aucun rapport généré</p>
            <p className="text-xs mt-1 max-w-sm mx-auto">
              Les rapports sont générés automatiquement le 1er de chaque mois, ou
              manuellement via le bouton ci-dessus.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
