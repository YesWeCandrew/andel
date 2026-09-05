import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Cart, EditPencil, Minus, NavArrowLeft, Plus } from 'iconoir-react'
import { useRecipe } from '../../hooks/useRecipe'
import { usePageTitle } from '../../hooks/usePageTitle'
import { recipeApi, scaleQuantity } from '../../api/recipe'
import { formatQuantity } from './recipeHelpers'
import styles from './RecipeDetail.module.css'

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const recipeId = Number(id)
  const navigate = useNavigate()

  const { recipe, loading, error } = useRecipe(recipeId)
  usePageTitle(recipe ? recipe.name : 'Recipes')

  const [servingsOverride, setServingsOverride] = useState<number | null>(null)
  const [addingIds, setAddingIds] = useState<Set<number>>(new Set())
  const [addingAll, setAddingAll] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  // A fresh recipe id (navigated from elsewhere) should start back at its
  // own base servings, not carry over the previous recipe's adjustment.
  useEffect(() => {
    setServingsOverride(null)
  }, [recipe?.id])

  if (loading) {
    return (
      <div className={styles.detail}>
        <BackLink onClick={() => navigate('/recipes')} />
        <p className={styles.empty}>Loading…</p>
      </div>
    )
  }

  if (error || !recipe) {
    return (
      <div className={styles.detail}>
        <BackLink onClick={() => navigate('/recipes')} />
        <p className={styles.empty}>{error ?? 'Recipe not found.'}</p>
      </div>
    )
  }

  const servings = servingsOverride ?? recipe.servings

  function changeServings(delta: number) {
    setServingsOverride(Math.max(1, servings + delta))
  }

  async function handleAddOne(ingredientId: number, quantity: number) {
    setActionError(null)
    setAddingIds((prev) => new Set(prev).add(ingredientId))
    try {
      await recipeApi.addIngredientToList(recipeId, ingredientId, quantity)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add to shopping list')
    } finally {
      setAddingIds((prev) => {
        const next = new Set(prev)
        next.delete(ingredientId)
        return next
      })
    }
  }

  async function handleAddAll() {
    if (!recipe) return
    setActionError(null)
    setAddingAll(true)
    try {
      const payload = recipe.ingredients.map((ingredient) => ({
        ingredientId: ingredient.id,
        quantity: scaleQuantity(ingredient.quantity, recipe.servings, servings),
      }))
      await recipeApi.addAllToList(recipeId, payload)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add to shopping list')
    } finally {
      setAddingAll(false)
    }
  }

  return (
    <div className={styles.detail}>
      <BackLink onClick={() => navigate('/recipes')} />

      {recipe.photo_path && <img src={recipe.photo_path} alt="" className={styles.photo} />}

      <div className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={styles.name}>{recipe.name}</h1>
          {recipe.description && <p className={styles.description}>{recipe.description}</p>}
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate(`/recipes/${recipe.id}/edit`)}
          >
            <EditPencil width={14} height={14} strokeWidth={2.2} />
            Edit
          </button>
          <button
            type="button"
            className="button button-primary"
            onClick={handleAddAll}
            disabled={addingAll || recipe.ingredients.length === 0}
          >
            <Cart width={14} height={14} strokeWidth={2.2} />
            {addingAll ? 'Adding…' : 'Add all to shopping list'}
          </button>
        </div>
      </div>

      {actionError && <p className={styles.error}>{actionError}</p>}

      <div className={styles.body}>
        <section className={styles.ingredientsSection}>
          <div className={styles.sectionHeader}>
            <h2>Ingredients</h2>
            <div className={styles.servingsStepper}>
              <button
                type="button"
                className={styles.stepperButton}
                onClick={() => changeServings(-1)}
                disabled={servings <= 1}
                aria-label="Fewer servings"
              >
                <Minus width={14} height={14} strokeWidth={2.2} />
              </button>
              <span className={styles.servingsCount}>
                {servings} serving{servings === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                className={styles.stepperButton}
                onClick={() => changeServings(1)}
                aria-label="More servings"
              >
                <Plus width={14} height={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {recipe.ingredients.length === 0 ? (
            <p className={styles.empty}>No ingredients listed.</p>
          ) : (
            <ul className={styles.ingredientList}>
              {recipe.ingredients.map((ingredient) => {
                const quantity = scaleQuantity(ingredient.quantity, recipe.servings, servings)
                return (
                  <li key={ingredient.id} className={styles.ingredientRow}>
                    <span className={styles.ingredientQty}>{formatQuantity(quantity, ingredient.unit)}</span>
                    <span className={styles.ingredientName}>{ingredient.product}</span>
                    <button
                      type="button"
                      className={styles.addButton}
                      disabled={addingIds.has(ingredient.id)}
                      onClick={() => handleAddOne(ingredient.id, quantity)}
                      aria-label={`Add ${ingredient.product} to shopping list`}
                      title="Add to shopping list"
                    >
                      <Cart width={16} height={16} strokeWidth={2} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className={styles.stepsSection}>
          <h2>Steps</h2>
          {recipe.steps ? (
            <p className={styles.stepsText}>{recipe.steps}</p>
          ) : (
            <p className={styles.empty}>No steps yet.</p>
          )}
        </section>
      </div>
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={styles.backLink} onClick={onClick}>
      <NavArrowLeft width={16} height={16} strokeWidth={2.2} />
      Recipes
    </button>
  )
}
