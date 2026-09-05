import { useEffect, useRef, useState } from 'react'
import { Xmark } from 'iconoir-react'
import { productApi } from '../../api/shoppingList'
import type { ProductSuggestion, Unit } from '../../api/shoppingList'
import styles from './RecipeIngredientField.module.css'

export interface RecipeIngredientRowValue {
  product: string
  quantity: number
  unit: string
}

interface RecipeIngredientFieldProps {
  value: RecipeIngredientRowValue
  units: Unit[]
  onChange: (patch: Partial<RecipeIngredientRowValue>) => void
  onRemove: () => void
  removable: boolean
}

// A single ingredient row — product autocomplete (same find-or-create-by-name
// UX as ShoppingListForm's product field) plus quantity/unit and a remove
// button. Used as a repeatable row inside RecipeForm.
export function RecipeIngredientField({ value, units, onChange, onRemove, removable }: RecipeIngredientFieldProps) {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const datalistId = useRef(`recipe-units-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    const query = value.product.trim()
    if (!query) return

    let cancelled = false
    const timeout = setTimeout(async () => {
      try {
        const results = await productApi.search(query)
        if (!cancelled) setSuggestions(results)
      } catch {
        if (!cancelled) setSuggestions([])
      }
    }, 200)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [value.product])

  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current)
    }
  }, [])

  function selectSuggestion(suggestion: ProductSuggestion) {
    onChange({
      product: suggestion.product,
      quantity: suggestion.suggestedQuantity ?? value.quantity,
      unit: suggestion.suggestedUnit ?? value.unit,
    })
    setSuggestionsOpen(false)
  }

  return (
    <div className={styles.row}>
      <div className={styles.autocomplete}>
        <input
          className={styles.productInput}
          value={value.product}
          onChange={(event) => {
            onChange({ product: event.target.value })
            setSuggestionsOpen(true)
          }}
          onFocus={() => setSuggestionsOpen(true)}
          onBlur={() => {
            // Delay so a click on a suggestion registers before the list closes.
            blurTimeout.current = setTimeout(() => setSuggestionsOpen(false), 150)
          }}
          placeholder="Ingredient"
          autoComplete="off"
        />
        {suggestionsOpen && value.product.trim() && suggestions.length > 0 && (
          <ul className={styles.suggestions}>
            {suggestions.map((suggestion) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  className={styles.suggestion}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  {suggestion.product}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <input
        type="number"
        min={0}
        step="any"
        className={styles.quantityInput}
        value={value.quantity}
        onChange={(event) => onChange({ quantity: Number(event.target.value) || 0 })}
        aria-label="Quantity"
      />

      <input
        className={styles.unitInput}
        list={datalistId}
        value={value.unit}
        onChange={(event) => onChange({ unit: event.target.value })}
        placeholder="unit"
        autoComplete="off"
        aria-label="Unit"
      />
      <datalist id={datalistId}>
        {units.map((u) => (
          <option key={u.id} value={u.unit ?? ''} />
        ))}
      </datalist>

      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        disabled={!removable}
        aria-label="Remove ingredient"
      >
        <Xmark width={16} height={16} strokeWidth={2} />
      </button>
    </div>
  )
}
