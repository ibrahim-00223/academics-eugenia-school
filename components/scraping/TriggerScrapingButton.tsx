'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Play, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface TriggerScrapingButtonProps {
  sourceId: string
  sourceName: string
}

export function TriggerScrapingButton({ sourceId, sourceName }: TriggerScrapingButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleTrigger = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/scraping/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erreur inconnue')
      toast.success(`Scraping lancé pour ${sourceName.replace(/_/g, ' ')}`)
    } catch (err) {
      toast.error(`Impossible de lancer le scraping : ${err instanceof Error ? err.message : 'Erreur'}`)
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
