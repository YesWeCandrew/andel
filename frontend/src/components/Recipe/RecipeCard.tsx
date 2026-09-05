import { PizzaSlice } from 'iconoir-react'
import type { RecipeSummary } from '../../api/recipe'
import styles from './RecipeCard.module.css'

interface RecipeCardProps {
  recipe: Pick<RecipeSummary, 'id' | 'name' | 'description' | 'photo_path'>
  onClick: (id: number) => void
}

export function RecipeCard({ recipe, onClick }: RecipeCardProps) {
  return (
    <button type="button" className={styles.card} onClick={() => onClick(recipe.id)}>
      <span className={styles.photo}>
        {recipe.photo_path ? (
          <img src={recipe.photo_path} alt="" className={styles.photoImg} />
        ) : (
          <PizzaSlice width={22} height={22} strokeWidth={1.6} className={styles.photoPlaceholder} />
        )}
      </span>
      <span className={styles.body}>
        <span className={styles.name}>{recipe.name}</span>
        {recipe.description && <span className={styles.description}>{recipe.description}</span>}
      </span>
    </button>
  )
}
