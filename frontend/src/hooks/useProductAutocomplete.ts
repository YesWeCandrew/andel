import { useEffect, useRef, useState } from 'react'
import { productApi } from '../api/shoppingList'
import type { ProductSuggestion } from '../api/shoppingList'

const SEARCH_DEBOUNCE_MS = 200
const BLUR_CLOSE_DELAY_MS = 150

/**
 * Product-name autocomplete shared by ShoppingListForm and
 * RecipeIngredientField: debounces a search-as-you-type lookup, and delays
 * closing the suggestion list on blur so a click on a suggestion registers
 * before it closes.
 */
export function useProductAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) return

    let cancelled = false
    const timeout = setTimeout(async () => {
      try {
        const results = await productApi.search(trimmed)
        if (!cancelled) setSuggestions(results)
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [query])

  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current)
    }
  }, [])

  function open() {
    setSuggestionsOpen(true)
  }

  function scheduleClose() {
    blurTimeout.current = setTimeout(() => setSuggestionsOpen(false), BLUR_CLOSE_DELAY_MS)
  }

  function close() {
    setSuggestionsOpen(false)
  }

  return { suggestions, suggestionsOpen, open, close, scheduleClose, setSuggestions }
}
