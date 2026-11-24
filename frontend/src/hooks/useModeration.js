import { useMemo } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { createModerationService } from '../services/moderationService.js'

export function useModeration() {
  const { user, requestAuthenticated } = useAuth()
  const service = useMemo(() => createModerationService(requestAuthenticated, user), [requestAuthenticated, user])
  return { user, service }
}
