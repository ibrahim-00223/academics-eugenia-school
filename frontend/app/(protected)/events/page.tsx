import { cookies } from 'next/headers'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Plus, Users, Zap } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { apiServer } from '@/lib/api/client'
import type { Event } from '@/lib/api/types'

const eventTypeConfig: Record<string, { label: string; color: string }> = {
  hackathon:   { label: 'Hackathon',    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
  conference:  { label: 'Conférence',   color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  workshop:    { label: 'Workshop',     color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  meetup:      { label: 'Meetup',       color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  career_fair: { label: 'Forum emploi', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
  webinar:     { label: 'Webinaire',    color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft:     { label: 'Brouillon', variant: 'secondary' },
  confirmed: { label: 'Confirmé',  variant: 'default' },
  completed: { label: 'Terminé',   variant: 'outline' },
  cancelled: { label: 'Annulé',    variant: 'secondary' },
}

export default async function EventsPage() {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore.getAll().map((c) => `${c.name}=${c.value}`).join('; ')

  const events = await apiServer<Event[]>('/api/events', cookieHeader).catch(() => [])

  const now = new Date()
  const upcoming = (events as Event[]).filter(
    (e) => e.scheduled_date && new Date(e.scheduled_date) >= now,
  )
  const past = (events as Event[]).filter(
    (e) => !e.scheduled_date || new Date(e.scheduled_date) < now,
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Événements</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Planifiez les actions pédagogiques issues de l&apos;analyse du marché
          </p>
        </div>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-4 h-4" />
          Nouvel événement
        </Button>
      </div>

      {/* Upcoming */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-semibold">À venir</h2>
          <Badge variant="secondary" className="text-xs">{upcoming.length}</Badge>
        </div>

        {upcoming.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcoming.map((event) => {
              const typeConf   = eventTypeConfig[event.event_type] ?? eventTypeConfig.workshop
              const statusConf = statusConfig[event.status]        ?? statusConfig.draft
              return (
                <Card key={event.id} className="border-border/50">
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${typeConf.color}`}>
                            {typeConf.label}
                          </span>
                          <Badge variant={statusConf.variant} className="text-xs">
                            {statusConf.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-semibold">{event.title}</p>
                        {event.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                    {event.scheduled_date && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5" />
                        {format(new Date(event.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        ) : (
          <Card className="border-border/50 border-dashed">
            <CardContent className="py-10 text-center text-muted-foreground">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">Aucun événement à venir</p>
              <p className="text-xs mt-1">
                Les événements suggérés par les rapports apparaîtront ici.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Past events */}
      {past.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-muted-foreground">Passés</h2>
            <Badge variant="outline" className="text-xs">{past.length}</Badge>
          </div>
          <div className="space-y-2">
            {past.slice(0, 5).map((event) => {
              const typeConf = eventTypeConfig[event.event_type] ?? eventTypeConfig.workshop
              return (
                <div
                  key={event.id}
                  className="flex items-center justify-between py-2.5 border-b border-border/30 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeConf.color} flex-shrink-0`}>
                      {typeConf.label}
                    </span>
                    <p className="text-sm truncate">{event.title}</p>
                  </div>
                  {event.scheduled_date && (
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">
                      {format(new Date(event.scheduled_date), 'dd MMM yyyy', { locale: fr })}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
