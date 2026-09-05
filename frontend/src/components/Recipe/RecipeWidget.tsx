import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Collapse, PizzaSlice, Plus, Search } from 'iconoir-react'
import { useRecipes } from '../../hooks/useRecipes'
import { usePageTitle } from '../../hooks/usePageTitle'
import { RecipeCard } from './RecipeCard'
import { pickRandom } from './recipeHelpers'
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
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const isTile = variant === 'tile'
  usePageTitle(isTile ? undefined : 'Recipes')

  // Re-picked whenever the recipe list itself changes (new fetch reference),
  // which is exactly when a fresh random selection makes sense.
  const randomRecipes = useMemo(() => pickRandom(recipes, maxTileItems), [recipes, maxTileItems])

  const query = search.trim().toLowerCase()
  const filteredRecipes = useMemo(() => {
    if (!query) return recipes
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.description ?? '').toLowerCase().includes(query) ||
        r.ingredientNames.some((name) => name.toLowerCase().includes(query)),
    )
  }, [recipes, query])

  const visibleRecipes = isTile ? randomRecipes : filteredRecipes

  function openRecipe(id: number) {
    navigate(`/recipes/${id}`)
  }

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <div
        className={styles.header}
        onClick={isTile ? onExpand : undefined}
        role={isTile && onExpand ? 'button' : undefined}
        tabIndex={isTile && onExpand ? 0 : undefined}
      >
        <PizzaSlice className={styles.headerIcon} width={32} height={32} strokeWidth={1.7} />
        <h1 className={styles.title}>Recipes</h1>
        <span className={styles.count}>{recipes.length} recipes</span>
        <button
          type="button"
          className="button button-primary"
          onClick={(event) => {
            event.stopPropagation()
            navigate('/recipes/new')
          }}
        >
          <Plus width={14} height={14} strokeWidth={2.2} />
          New
        </button>
        {!isTile && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/')}
            aria-label="Back to dashboard"
            title="Collapse"
          >
            <Collapse width={14} height={14} strokeWidth={2.2} />
          </button>
        )}
      </div>

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
    </div>
  )
}
