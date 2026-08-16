import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Xmark } from 'iconoir-react'
import { productApi } from '../../api/shoppingList'
import type { ProductSuggestion, ShoppingListItem, Unit } from '../../api/shoppingList'
import styles from './ShoppingListForm.module.css'

export interface ShoppingListFormValues {
  product: string
  quantity: number
  unit: string
}

interface ShoppingListFormProps {
  /** Omit (or pass null) to add a new item; pass an item to edit it. */
  initialItem?: ShoppingListItem | null
  /** Existing units, offered as suggestions in the unit field. */
  units: Unit[]
  onSubmit: (values: ShoppingListFormValues) => Promise<void> | void
  onCancel: () => void
  onDelete?: () => Promise<void> | void
  submitting?: boolean
  error?: string | null
}

export function ShoppingListForm({
  initialItem,
  units,
  onSubmit,
  onCancel,
  onDelete,
  submitting = false,
  error = null,
}: ShoppingListFormProps) {
  const isEditing = Boolean(initialItem)

  const [product, setProduct] = useState(initialItem?.product ?? '')
  const [quantity, setQuantity] = useState(initialItem?.quantity ?? 1)
  const [unit, setUnit] = useState(initialItem?.unit ?? '')
  const [productError, setProductError] = useState<string | null>(null)

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([])
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Look up matching products as the user types — this is what lets picking a
  // match auto-fill the quantity/unit it's most commonly bought with.
  useEffect(() => {
    const query = product.trim()
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
  }, [product])

  useEffect(() => {
    return () => {
      if (blurTimeout.current) clearTimeout(blurTimeout.current)
    }
  }, [])

  function selectSuggestion(suggestion: ProductSuggestion) {
    setProduct(suggestion.product)
    if (suggestion.suggestedQuantity != null) setQuantity(suggestion.suggestedQuantity)
    setUnit(suggestion.suggestedUnit ?? '')
    setSuggestionsOpen(false)
  }

  async function handleDeleteSuggestion(suggestionId: number) {
    try {
      await productApi.remove(suggestionId)
    } catch {
      // Best-effort — the suggestion is removed from view either way.
    }
    setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const trimmedProduct = product.trim()
    if (!trimmedProduct) {
      setProductError('Give it a name')
      return
    }

    onSubmit({
      product: trimmedProduct,
      quantity: quantity || 1,
      unit: unit.trim(),
    })
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>{isEditing ? 'Edit item' : 'Add item'}</h2>
        <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">
          <Xmark width={16} height={16} strokeWidth={2} />
        </button>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="shopping-item-product">
          Item
        </label>
        <div className={styles.autocomplete}>
          <input
            id="shopping-item-product"
            className={styles.input}
            value={product}
            onChange={(e) => {
              setProduct(e.target.value)
              setSuggestionsOpen(true)
              if (productError) setProductError(null)
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onBlur={() => {
              // Delay so a click on a suggestion registers before the list closes.
              blurTimeout.current = setTimeout(() => setSuggestionsOpen(false), 150)
            }}
            placeholder="Asparagus"
            autoComplete="off"
            autoFocus
          />
          {suggestionsOpen && product.trim() && suggestions.length > 0 && (
            <ul className={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <li key={suggestion.id} className={styles.suggestionRow}>
                  <button
                    type="button"
                    className={styles.suggestion}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSuggestion(suggestion)}
                  >
                    {suggestion.product}
                  </button>
                  <button
                    type="button"
                    className={styles.suggestionRemove}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleDeleteSuggestion(suggestion.id)}
                    aria-label={`Remove "${suggestion.product}" from suggestions`}
                    title="Remove suggestion"
                  >
                    <Xmark width={13} height={13} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {productError && <p className={styles.error}>{productError}</p>}
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="shopping-item-quantity">
            Quantity
          </label>
          <input
            id="shopping-item-quantity"
            type="number"
            min={0}
            step="any"
            className={styles.quantityInput}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
          />
        </div>

        <div className={styles.field} style={{ flex: 1 }}>
          <label className={styles.label} htmlFor="shopping-item-unit">
            Unit
          </label>
          <input
            id="shopping-item-unit"
            className={styles.input}
            list="shopping-units"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="piece"
            autoComplete="off"
          />
          <datalist id="shopping-units">
            {units.map((u) => (
              <option key={u.id} value={u.unit ?? ''} />
            ))}
          </datalist>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button type="submit" className={`button button-primary ${styles.submitButton}`} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </button>
        {isEditing && onDelete && (
          <button
            type="button"
            className={`button button-danger ${styles.deleteButton}`}
            onClick={onDelete}
            disabled={submitting}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
