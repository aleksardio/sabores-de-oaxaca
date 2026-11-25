import { useMemo } from 'react'
import { useAuth } from '../auth/useAuth.js'
import { createReportsService } from '../services/reportsService.js'

export function useReports() {
  const { user, requestAuthenticated } = useAuth()
  const service = useMemo(() => createReportsService(requestAuthenticated, user), [requestAuthenticated, user])
  return { user, service }
}
