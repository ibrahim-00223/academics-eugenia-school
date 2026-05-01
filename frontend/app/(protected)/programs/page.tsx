import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, GraduationCap, Plus } from 'lucide-react'
import Link from 'next/link'
import type { Database as AppDatabase } from '@/types/database'

export default async function ProgramsPage() {
  const supabase = await createClient()

  type ProgramWithSemesters = AppDatabase['public']['Tables']['programs']['Row'] & {
    semesters: Array<{ id: string; number: number; modules: Array<{ id: string }> }>
  }

  const { data: rawPrograms } = await supabase
    .from('programs')
    .select('*')
    .order('level', { ascending: false })
    .order('name')

  // Fetch semesters + modules count separately to avoid join type issues
  const programIds = rawPrograms?.map((p) => p.id) ?? []
  const { data: semesters } = programIds.length > 0
    ? await supabase
        .from('semesters')
        .select('id, program_id, number')
        .in('program_id', programIds)
    : { data: [] }

  const semesterIds = semesters?.map((s) => s.id) ?? []
  const { data: modules } = semesterIds.length > 0
    ? await supabase
        .from('modules')
        .select('id, semester_id')
        .in('semester_id', semesterIds)
        .eq('is_active', true)
    : { data: [] }

  const programs: ProgramWithSemesters[] = (rawPrograms ?? []).map((p) => ({
    ...p,
    semesters: (semesters ?? [])
      .filter((s) => s.program_id === p.id)
      .map((s) => ({
        id: s.id,
        number: s.number,
        modules: (modules ?? []).filter((m) => m.semester_id === s.id),
      })),
  }))

  const bachelors = programs.filter((p) => p.level === 'bachelor')
  const masters = programs.filter((p) => p.level === 'master')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programmes</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Gérez les programmes Bachelor et Master et leurs modules
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nouveau programme
        </Button>
      </div>

      {[
        { label: 'Master', icon: GraduationCap, items: masters, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        { label: 'Bachelor', icon: BookOpen, items: bachelors, color: 'text-blue-500', bg: 'bg-blue-500/10' },
      ].map(({ label, icon: Icon, items, color, bg }) => (
        <div key={label}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`p-1.5 rounded-lg ${bg}`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <h2 className="text-base font-semibold">{label}</h2>
            <Badge variant="secondary" className="text-xs">
              {items.length}
            </Badge>
          </div>

          {items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((program) => {
                const semesterCount = program.semesters.length
                const moduleCount = program.semesters.reduce(
                  (acc, s) => acc + s.modules.length,
                  0
                )

                return (
                  <Link key={program.id} href={`/programs/${program.id}`}>
                    <Card className="border-border/50 hover:border-border transition-colors cursor-pointer h-full">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-sm font-semibold leading-snug">
                            {program.name}
                          </CardTitle>
                          <Badge
                            variant={program.is_active ? 'default' : 'secondary'}
                            className="text-xs flex-shrink-0"
                          >
                            {program.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </div>
                        {program.description && (
                          <CardDescription className="text-xs line-clamp-2">
                            {program.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{program.duration_years} an{program.duration_years > 1 ? 's' : ''}</span>
                          <span>·</span>
                          <span>{semesterCount} semestre{semesterCount > 1 ? 's' : ''}</span>
                          <span>·</span>
                          <span>{moduleCount} module{moduleCount > 1 ? 's' : ''}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          ) : (
            <Card className="border-border/50 border-dashed">
              <CardContent className="py-8 text-center text-muted-foreground">
                <Icon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Aucun programme {label} configuré</p>
                <p className="text-xs mt-1">Cliquez sur &quot;Nouveau programme&quot; pour commencer.</p>
              </CardContent>
            </Card>
          )}
        </div>
      ))}
    </div>
  )
}
