import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { PizzaSlice, Search } from 'iconoir-react'
import { useRecipes } from '../../hooks/useRecipes'
import { useUnits } from '../../hooks/useUnits'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useGoBack } from '../../hooks/useGoBack'
import { recipeApi } from '../../api/recipe'
import type { CreateRecipeInput } from '../../api/recipe'
import { RecipeCard } from './RecipeCard'
import { RecipeForm } from './RecipeForm'
import { pickRandom } from './recipeHelpers'
import { filterRecipes } from '../../lib/search'
import { getErrorMessage } from '../../lib/errors'
import { WidgetHeader } from '../shared/WidgetHeader'
import { NewButton } from '../shared/NewButton'
import { FormOverlay } from '../shared/FormOverlay'
import styles from './RecipeWidget.module.css'

interface RecipeWidgetProps {
  /**
   * 'full' renders the standalone app view; 'tile' renders a compact,
   * height-limited card meant to sit on the dashboard.
   */
  variant?: 'tile' | 'full'
  /** Called when a tile-variant widget wants to become the full view. */
  onExpand?: () => void
  /** How many recipes to show at random in tile mode before "see more". */
  maxTileItems?: number
}

export function RecipeWidget({ variant = 'full', onExpand, maxTileItems = 3 }: RecipeWidgetProps) {
  const { recipes, loading, error } = useRecipes()
  const units = useUnits()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const location = useLocation()
  const [search, setSearch] = useState('')

  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const isTile = variant === 'tile'
  usePageTitle(isTile ? undefined : 'Recipes')

  // /recipes/new opens the create form as an overlay on top of the list.
  const newFormOpen = !isTile && location.pathname === '/recipes/new'

  function closeForm() {
    setFormError(null)
    // Pop the /recipes/new entry rather than pushing the list again.
    goBack('/recipes')
  }

  async function handleFormSubmit(input: CreateRecipeInput, photoFile: File | null) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      const saved = await recipeApi.create(input)
      if (photoFile) await recipeApi.uploadPhoto(saved.id, photoFile)
      // Replace /recipes/new so going back from the new recipe skips the form.
      navigate(`/recipes/${saved.id}`, { replace: true })
    } catch (err) {
      setFormError(getErrorMessage(err, 'Something went wrong, please try again'))
    } finally {
      setFormSubmitting(false)
    }
  }

  // Re-picked whenever the recipe list itself changes (new fetch reference),
  // which is exactly when a fresh random selection makes sense.
  const randomRecipes = useMemo(() => pickRandom(recipes, maxTileItems), [recipes, maxTileItems])

  const query = search.trim()
  const filteredRecipes = useMemo(() => filterRecipes(recipes, query), [recipes, query])

  const visibleRecipes = isTile ? randomRecipes : filteredRecipes

  function openRecipe(id: number) {
    navigate(`/recipes/${id}`)
  }

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <WidgetHeader
        icon={PizzaSlice}
        title="Recipes"
        count={`${recipes.length} recipes`}
        isTile={isTile}
        onExpand={onExpand}
        primaryAction={<NewButton onClick={() => navigate('/recipes/new')} />}
      />

      {!isTile && (
        <div className={styles.searchRow}>
          <Search width={16} height={16} strokeWidth={2} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes, ingredients…"
            aria-label="Search recipes"
          />
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : visibleRecipes.length === 0 ? (
        <p className={styles.empty}>
          {query ? 'No recipes match your search.' : 'No recipes yet — add your first one.'}
        </p>
      ) : (
        <div className={isTile ? styles.tileList : styles.grid}>
          {visibleRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={openRecipe} />
          ))}
        </div>
      )}

      {isTile && recipes.length > maxTileItems && (
        <button type="button" className={styles.seeAll} onClick={onExpand}>
          See {recipes.length - maxTileItems} more recipes
        </button>
      )}

      {newFormOpen && (
        <FormOverlay onClose={closeForm} maxWidth={720} align="top">
          <RecipeForm
            units={units}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            submitting={formSubmitting}
            error={formError}
          />
        </FormOverlay>
      )}
    </div>
  )
}
