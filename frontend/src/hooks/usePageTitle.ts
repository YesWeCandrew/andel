import { useEffect } from 'react'

export function usePageTitle(page?: string) {
  useEffect(() => {
    if (!page) return
    document.title = `Andel - ${page}`
  }, [page])
}
