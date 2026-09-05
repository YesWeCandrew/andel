import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PizzaSlice, Xmark } from 'iconoir-react'
import type { MealPlanEntry } from '../../api/mealplan'
import styles from './MealPlanEntryCard.module.css'

interface MealPlanEntryCardProps {
  entry: MealPlanEntry
  onOpen: (recipeId: number) => void
  onRemove: (id: number) => void
}

export function MealPlanEntryCard({ entry, onOpen, onRemove }: MealPlanEntryCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.card} {...attributes} {...listeners}>
      <button
        type="button"
        className={styles.body}
        disabled={!entry.recipe}
        onClick={() => entry.recipe && onOpen(entry.recipe.id)}
      >
        <span className={styles.photo}>
          {entry.recipe?.photo_path ? (
            <img src={entry.recipe.photo_path} alt="" className={styles.photoImg} />
          ) : entry.recipe ? (
            <PizzaSlice width={20} height={20} strokeWidth={1.6} className={styles.photoPlaceholder} />
          ) : null}
        </span>
        <span className={styles.name}>{entry.recipe?.name ?? entry.note}</span>
      </button>
      <button
        type="button"
        className={styles.removeButton}
        onPointerDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.stopPropagation()
          onRemove(entry.id)
        }}
        aria-label="Remove"
      >
        <Xmark width={13} height={13} strokeWidth={2} />
      </button>
    </div>
  )
}
