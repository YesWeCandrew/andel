import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'iconoir-react'
import type { MealPlanEntry } from '../../api/mealplan'
import { formatDayLabel } from './mealPlanHelpers'
import { MealPlanEntryCard } from './MealPlanEntryCard'
import styles from './MealPlanDay.module.css'

export const DAY_CONTAINER_PREFIX = 'day:'

interface MealPlanDayProps {
  date: string
  todayIso: string
  entries: MealPlanEntry[]
  onOpenRecipe: (recipeId: number) => void
  onRemove: (id: number) => void
  onAdd: (date: string) => void
}

export function MealPlanDay({ date, todayIso, entries, onOpenRecipe, onRemove, onAdd }: MealPlanDayProps) {
  const { setNodeRef } = useDroppable({ id: `${DAY_CONTAINER_PREFIX}${date}` })

  return (
    <div ref={setNodeRef} className={styles.day}>
      <div className={styles.labelRow}>
        <h3 className={date === todayIso ? 'tag tag-accent' : 'tag'}>{formatDayLabel(date, todayIso)}</h3>
      </div>
      <div className={styles.list}>
        <SortableContext items={entries.map((e) => e.id)} strategy={verticalListSortingStrategy}>
          {entries.map((entry) => (
            <MealPlanEntryCard key={entry.id} entry={entry} onOpen={onOpenRecipe} onRemove={onRemove} />
          ))}
        </SortableContext>
      </div>
      <button type="button" className={styles.addButton} onClick={() => onAdd(date)}>
        <Plus width={14} height={14} strokeWidth={2.2} />
        Add
      </button>
    </div>
  )
}
