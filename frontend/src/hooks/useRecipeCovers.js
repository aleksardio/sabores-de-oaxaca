import { useEffect, useRef, useState } from 'react'
import { createRecipeCoverQueue } from '../services/recipeCovers.js'

export function useRecipeCovers(recipes, scope) {
  const queue = useRef(null)
  const [result, setResult] = useState(null)
  const ids = (recipes ?? []).map(({ id }) => id).join(',')

  useEffect(() => {
    const current = createRecipeCoverQueue((id, image) => {
      if (!image) return
      setResult((previous) => ({
        scope,
        images: { ...(previous?.scope === scope ? previous.images : {}), [id]: image },
      }))
    })
    queue.current = current
    return () => current.cancel()
  }, [scope])

  useEffect(() => {
    queue.current.show(ids ? ids.split(',').map(Number) : [])
  }, [ids, scope])

  return result?.scope === scope ? result?.images : undefined
}
