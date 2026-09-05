import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { NavArrowLeft, Plus, Trash, UploadSquare } from 'iconoir-react'
import { useRecipe } from '../../hooks/useRecipe'
import { usePageTitle } from '../../hooks/usePageTitle'
import { recipeApi } from '../../api/recipe'
import { unitApi } from '../../api/shoppingList'
import type { Unit } from '../../api/shoppingList'
import { RecipeIngredientField } from './RecipeIngredientField'
import type { RecipeIngredientRowValue } from './RecipeIngredientField'
import styles from './RecipeForm.module.css'

interface IngredientRow extends RecipeIngredientRowValue {
  key: string
}

function emptyRow(): IngredientRow {
  return { key: crypto.randomUUID(), product: '', quantity: 1, unit: '' }
}

export function RecipeForm() {
  const { id } = useParams<{ id?: string }>()
  const isEditing = id !== undefined
  const recipeId = isEditing ? Number(id) : undefined
  const navigate = useNavigate()

  const { recipe, loading: recipeLoading } = useRecipe(recipeId)
  usePageTitle(isEditing ? 'Edit recipe' : 'New recipe')

  const [units, setUnits] = useState<Unit[]>([])
  useEffect(() => {
    unitApi.list().then(setUnits).catch(() => setUnits([]))
  }, [])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState('')
  const [servings, setServings] = useState(1)
  const [ingredients, setIngredients] = useState<IngredientRow[]>([emptyRow()])
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(!isEditing)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  // Preload the form once the existing recipe has loaded (edit mode only).
  useEffect(() => {
    if (!isEditing || !recipe || initialized) return
    setName(recipe.name)
    setDescription(recipe.description ?? '')
    setSteps(recipe.steps ?? '')
    setServings(recipe.servings)
    setIngredients(
      recipe.ingredients.length
        ? recipe.ingredients.map((ingredient) => ({
            key: crypto.randomUUID(),
            product: ingredient.product,
            quantity: ingredient.quantity,
            unit: ingredient.unit ?? '',
          }))
        : [emptyRow()],
    )
    setPhotoPreview(recipe.photo_path)
    setInitialized(true)
  }, [isEditing, recipe, initialized])

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

  async function handleSubmit(event: FormEvent) {
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
      }))

    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        name: trimmedName,
        description: description.trim(),
        steps: steps.trim(),
        servings: servings || 1,
        ingredients: ingredientInputs,
      }

      const saved =
        isEditing && recipeId !== undefined
          ? await recipeApi.update(recipeId, payload)
          : await recipeApi.create(payload)

      if (photoFile) {
        await recipeApi.uploadPhoto(saved.id, photoFile)
      }

      navigate(`/recipes/${saved.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong, please try again')
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (recipeId === undefined) return
    setSubmitting(true)
    setError(null)
    try {
      await recipeApi.remove(recipeId)
      navigate('/recipes')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong, please try again')
      setSubmitting(false)
    }
  }

  if (isEditing && recipeLoading && !initialized) {
    return (
      <div className={styles.page}>
        <p className={styles.empty}>Loading…</p>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.headerRow}>
          <button type="button" className={styles.backLink} onClick={() => navigate(-1)}>
            <NavArrowLeft width={16} height={16} strokeWidth={2.2} />
            Back
          </button>
          <h1 className={styles.heading}>{isEditing ? 'Edit recipe' : 'New recipe'}</h1>
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
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save'}
          </button>
          {isEditing && (
            <button
              type="button"
              className="button button-danger"
              onClick={handleDelete}
              disabled={submitting}
            >
              <Trash width={14} height={14} strokeWidth={2.2} />
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
