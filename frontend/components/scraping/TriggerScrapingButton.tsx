'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api/client'

interface TriggerScrapingButtonProps {
  sourceId: string
  sourceName: string
}

export function TriggerScrapingButton({ sourceId, sourceName }: TriggerScrapingButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleTrigger = async () => {
    setLoading(true)
    try {
      await apiFetch('/api/scraping/trigger', {
        method: 'POST',
        body: JSON.stringify({ source_id: sourceId }),
      })
      toast.success(`Scraping lancé pour ${sourceName.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error(
        `Impossible de lancer le scraping : ${err instanceof Error ? err.message : 'Erreur'}`,
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleTrigger}
      disabled={loading}
      className="h-7 text-xs gap-1.5"
    >
      {loading ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Play className="w-3 h-3" />
      )}
      Lancer
    </Button>
  )
}
