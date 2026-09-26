import { Xmark } from 'iconoir-react'
import type { ProductSuggestion, Unit } from '../../api/shoppingList'
import { useProductAutocomplete } from '../../hooks/useProductAutocomplete'
import { UnitSelect } from '../shared/UnitSelect'
import styles from './RecipeIngredientField.module.css'

export interface RecipeIngredientRowValue {
  product: string
  quantity: number
  unit: string
  note: string
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
  const { suggestions, suggestionsOpen, open, close, scheduleClose } = useProductAutocomplete(value.product)

  function selectSuggestion(suggestion: ProductSuggestion) {
    onChange({
      product: suggestion.product,
      quantity: suggestion.suggestedQuantity ?? value.quantity,
      unit: suggestion.suggestedUnit ?? value.unit,
    })
    close()
  }

  return (
    <div className={styles.row}>
      <div className={styles.autocomplete}>
        <input
          className={styles.productInput}
          value={value.product}
          onChange={(event) => {
            onChange({ product: event.target.value })
            open()
          }}
          onFocus={open}
          onBlur={scheduleClose}
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

      <UnitSelect
        className={styles.unitInput}
        value={value.unit}
        units={units}
        onChange={(unit) => onChange({ unit })}
      />

      <input
        className={styles.noteInput}
        value={value.note}
        onChange={(event) => onChange({ note: event.target.value })}
        placeholder="notes"
        autoComplete="off"
        aria-label="Notes"
      />

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
