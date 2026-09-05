import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Search, Xmark } from 'iconoir-react'
import { useRecipes } from '../../hooks/useRecipes'
import { RecipeCard } from '../Recipe/RecipeCard'
import styles from './MealPlanAddForm.module.css'

interface MealPlanAddFormProps {
  dayLabel: string
  onSelectRecipe: (recipeId: number) => void
  onAddNote: (note: string) => void
  onCancel: () => void
  submitting?: boolean
  error?: string | null
}

export function MealPlanAddForm({
  dayLabel,
  onSelectRecipe,
  onAddNote,
  onCancel,
  submitting = false,
  error = null,
}: MealPlanAddFormProps) {
  const { recipes } = useRecipes()
  const [search, setSearch] = useState('')

  // Same client-side substring match as RecipeWidget's search — the full
  // recipe list is already loaded and household-scale, so there's no need
  // for a backend search endpoint here.
  const query = search.trim().toLowerCase()
  const matches = useMemo(() => {
    if (!query) return recipes
    return recipes.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        (r.description ?? '').toLowerCase().includes(query) ||
        r.ingredientNames.some((name) => name.toLowerCase().includes(query)),
    )
  }, [recipes, query])

  function handleAddNote(event: FormEvent) {
    event.preventDefault()
    const note = search.trim()
    if (note) onAddNote(note)
  }

  return (
    <div className={styles.form}>
      <div className={styles.headerRow}>
        <h2 className={styles.heading}>Add to {dayLabel}</h2>
        <button type="button" className={styles.closeButton} onClick={onCancel} aria-label="Close">
          <Xmark width={16} height={16} strokeWidth={2} />
        </button>
      </div>

      <form className={styles.searchRow} onSubmit={handleAddNote}>
        <Search width={16} height={16} strokeWidth={2} className={styles.searchIcon} />
        <input
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search recipes…"
          aria-label="Search recipes"
          autoFocus
        />
      </form>

      {error && <p className={styles.error}>{error}</p>}

      {query && matches.length === 0 ? (
        <button type="button" className="button button-primary" disabled={submitting} onClick={() => onAddNote(search.trim())}>
          Add "{search.trim()}" as a note
        </button>
      ) : (
        <div className={styles.results}>
          {matches.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onClick={onSelectRecipe} />
          ))}
        </div>
      )}
    </div>
  )
}
