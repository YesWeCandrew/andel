import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Returns a function that steps back through browser history, like the
 * browser's own back button. If there aren't enough in-app entries to step
 * back through (e.g. the page was opened from a bookmark or shared link),
 * it replaces the current entry with `fallback` instead, so the user never
 * gets bounced out of the app.
 */
export function useGoBack() {
  const navigate = useNavigate()

  return useCallback(
    (fallback: string, steps = 1) => {
      // React Router's BrowserRouter records each entry's position in the
      // session's history stack as `idx`; the first in-app entry is 0.
      const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
      if (idx >= steps) {
        navigate(-steps)
      } else {
        navigate(fallback, { replace: true })
      }
    },
    [navigate],
  )
}
