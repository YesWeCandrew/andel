import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Plus, Trash, UploadSquare, Xmark } from 'iconoir-react'
import type { CreateRecipeInput, Recipe } from '../../api/recipe'
import type { Unit } from '../../api/shoppingList'
import { RecipeIngredientField } from './RecipeIngredientField'
import type { RecipeIngredientRowValue } from './RecipeIngredientField'
import styles from './RecipeForm.module.css'

interface IngredientRow extends RecipeIngredientRowValue {
  key: string
}

function emptyRow(): IngredientRow {
  return { key: crypto.randomUUID(), product: '', quantity: 1, unit: '', note: '' }
}

interface RecipeFormProps {
  /** Omit (or pass null) to create a new recipe; pass a recipe to edit it. */
  initialRecipe?: Recipe | null
  units: Unit[]
  onSubmit: (input: CreateRecipeInput, photoFile: File | null) => Promise<void> | void
  onCancel: () => void
  onDelete?: () => Promise<void> | void
  submitting?: boolean
  error?: string | null
}

export function RecipeForm({
  initialRecipe,
  units,
  onSubmit,
  onCancel,
  onDelete,
  submitting = false,
  error = null,
}: RecipeFormProps) {
  const isEditing = Boolean(initialRecipe)

  const [name, setName] = useState(initialRecipe?.name ?? '')
  const [description, setDescription] = useState(initialRecipe?.description ?? '')
  const [steps, setSteps] = useState(initialRecipe?.steps ?? '')
  const [servings, setServings] = useState(initialRecipe?.servings ?? 1)
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialRecipe?.ingredients.length
      ? initialRecipe.ingredients.map((ingredient) => ({
          key: crypto.randomUUID(),
          product: ingredient.product,
          quantity: ingredient.quantity,
          unit: ingredient.unit ?? '',
          note: ingredient.note ?? '',
        }))
      : [emptyRow()],
  )
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialRecipe?.photo_path ?? null)
  const [nameError, setNameError] = useState<string | null>(null)

  // Release the blob URL for a discarded preview so we don't leak it.
  useEffect(() => {
    return () => {
      if (photoPreview?.startsWith('blob:')) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function updateIngredient(key: string, patch: Partial<RecipeIngredientRowValue>) {
    setIngredients((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function addIngredientRow() {
    setIngredients((prev) => [...prev, emptyRow()])
  }

  function removeIngredientRow(key: string) {
    setIngredients((prev) => (prev.length > 1 ? prev.filter((row) => row.key !== key) : prev))
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Give it a name')
      return
    }

    const ingredientInputs = ingredients
      .filter((row) => row.product.trim())
      .map((row) => ({
        product: row.product.trim(),
        quantity: row.quantity || 1,
        unit: row.unit.trim(),
        note: row.note.trim() || undefined,
      }))

    const input: CreateRecipeInput = {
      name: trimmedName,
      description: description.trim(),
      steps: steps.trim(),
      servings: servings || 1,
      ingredients: ingredientInputs,
    }

    onSubmit(input, photoFile)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>{isEditing ? 'Edit recipe' : 'New recipe'}</h2>
        <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">
          <Xmark width={16} height={16} strokeWidth={2} />
        </button>
      </div>

      <label className={styles.photoPicker}>
        {photoPreview ? (
          <img src={photoPreview} alt="" className={styles.photoPreview} />
        ) : (
          <span className={styles.photoPlaceholder}>
            <UploadSquare width={24} height={24} strokeWidth={1.6} />
            Add photo
          </span>
        )}
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoChange} hidden />
      </label>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipe-name">
          Name
        </label>
        <input
          id="recipe-name"
          className={styles.input}
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (nameError) setNameError(null)
          }}
          placeholder="Weeknight pasta"
          autoFocus
        />
        {nameError && <p className={styles.fieldError}>{nameError}</p>}
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipe-description">
          Description
        </label>
        <textarea
          id="recipe-description"
          className={styles.textarea}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          placeholder="A quick one for busy evenings"
        />
      </div>

      <div className={styles.field} style={{ maxWidth: 160 }}>
        <label className={styles.label} htmlFor="recipe-servings">
          Servings
        </label>
        <input
          id="recipe-servings"
          type="number"
          min={1}
          step={1}
          className={styles.input}
          value={servings}
          onChange={(event) => setServings(Number(event.target.value) || 1)}
        />
      </div>

      <div className={styles.field}>
        <div className={styles.ingredientsHeader}>
          <span className={styles.label}>Ingredients</span>
          <button type="button" className={styles.addRowButton} onClick={addIngredientRow}>
            <Plus width={14} height={14} strokeWidth={2.2} />
            Add ingredient
          </button>
        </div>
        <div className={styles.ingredientRows}>
          {ingredients.map((row) => (
            <RecipeIngredientField
              key={row.key}
              value={row}
              units={units}
              onChange={(patch) => updateIngredient(row.key, patch)}
              onRemove={() => removeIngredientRow(row.key)}
              removable={ingredients.length > 1}
            />
          ))}
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="recipe-steps">
          Steps
        </label>
        <textarea
          id="recipe-steps"
          className={styles.textarea}
          value={steps}
          onChange={(event) => setSteps(event.target.value)}
          rows={6}
          placeholder="Boil the pasta while..."
        />
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
            <Trash width={14} height={14} strokeWidth={2.2} />
            Delete
          </button>
        )}
      </div>
    </form>
  )
}
