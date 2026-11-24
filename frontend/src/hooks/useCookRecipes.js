import { useMemo } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { createCookRecipesService } from '../services/cookRecipesService.js'

export function useCookRecipes() {
  const { user, requestAuthenticated } = useAuth()
  const service = useMemo(() => createCookRecipesService(requestAuthenticated, user), [requestAuthenticated, user])
  return { user, service }
}
