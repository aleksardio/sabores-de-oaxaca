import { useEffect, useState } from 'react'

// The caller supplies a stable loader (or null to disable the request).
export function usePublicRequest(load) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!load) return
    const controller = new AbortController()
    const { signal } = controller
    load(signal).then(
      (data) => { if (!signal.aborted) setResult({ load, attempt, data }) },
      (error) => { if (!signal.aborted) setResult({ load, attempt, error }) },
    )
    return () => controller.abort()
  }, [load, attempt])

  // Ignore old results immediately, even before the effect cleanup runs.
  const current = result?.load === load && result.attempt === attempt ? result : null
  return {
    data: current?.data,
    error: current?.error,
    loading: Boolean(load && !current),
    retry: () => setAttempt((value) => value + 1),
  }
}
