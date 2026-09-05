import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, NavArrowLeft } from 'iconoir-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useMealPlan } from '../../hooks/useMealPlan'
import { usePageTitle } from '../../hooks/usePageTitle'
import { addDaysISO, formatDayLabel, toISODate } from './mealPlanHelpers'
import { MealPlanDay, DAY_CONTAINER_PREFIX } from './MealPlanDay'
import { MealPlanAddForm } from './MealPlanAddForm'
import styles from './MealPlanWidget.module.css'

const TILE_DAYS = 3
const PAGE_DAYS = 14

interface MealPlanWidgetProps {
  /**
   * 'full' renders the standalone app view; 'tile' renders a compact card
   * meant to sit on the dashboard, showing only today/tomorrow/day-after.
   */
  variant?: 'tile' | 'full'
  /** Called when a tile-variant widget wants to become the full view. */
  onExpand?: () => void
}

export function MealPlanWidget({ variant = 'full', onExpand }: MealPlanWidgetProps) {
  const navigate = useNavigate()
  const isTile = variant === 'tile'
  usePageTitle(isTile ? undefined : 'Meal planner')

  const todayIso = useMemo(() => toISODate(new Date()), [])
  const [daysLoaded, setDaysLoaded] = useState(PAGE_DAYS)
  const visibleDayCount = isTile ? TILE_DAYS : daysLoaded
  const endIso = useMemo(() => addDaysISO(todayIso, visibleDayCount - 1), [todayIso, visibleDayCount])

  const { entries, loading, error, create, remove, reorder } = useMealPlan(todayIso, endIso)

  const days = useMemo(
    () => Array.from({ length: visibleDayCount }, (_, i) => addDaysISO(todayIso, i)),
    [todayIso, visibleDayCount],
  )

  // Per-day ordering of entry ids, derived from the fetched entries.
  // `dragOverride` holds an optimistic version applied while a drag is in
  // progress (onDragOver/onDragEnd), ahead of the API round-trip that
  // ultimately persists it — cleared once that round-trip's refresh lands.
  const baseColumns = useMemo(() => {
    const map: Record<string, number[]> = {}
    for (const day of days) map[day] = []
    for (const entry of entries) {
      if (!map[entry.date]) map[entry.date] = []
      map[entry.date].push(entry.id)
    }
    return map
  }, [entries, days])

  const [dragOverride, setDragOverride] = useState<Record<string, number[]> | null>(null)
  const columns = dragOverride ?? baseColumns
  const entriesById = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries])

  const [addingDate, setAddingDate] = useState<string | null>(null)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  function findContainer(id: string | number): string | undefined {
    if (typeof id === 'string' && id.startsWith(DAY_CONTAINER_PREFIX)) {
      return id.slice(DAY_CONTAINER_PREFIX.length)
    }
    const numericId = Number(id)
    return Object.keys(columns).find((day) => columns[day]?.includes(numericId))
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeContainer = findContainer(active.id)
    const overContainer = findContainer(over.id)
    if (!activeContainer || !overContainer || activeContainer === overContainer) return

    const activeId = Number(active.id)

    setDragOverride((prev) => {
      const current = prev ?? baseColumns
      const activeItems = current[activeContainer] ?? []
      const overItems = current[overContainer] ?? []
      const overIndex = overItems.indexOf(Number(over.id))

      const newActiveItems = activeItems.filter((id) => id !== activeId)
      const insertAt = overIndex >= 0 ? overIndex : overItems.length
      const newOverItems = [...overItems.slice(0, insertAt), activeId, ...overItems.slice(insertAt)]

      return { ...current, [activeContainer]: newActiveItems, [overContainer]: newOverItems }
    })
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const container = over && findContainer(over.id)
    if (!over || !container) {
      setDragOverride(null)
      return
    }

    const activeId = Number(active.id)
    const items = columns[container] ?? []
    const activeIndex = items.indexOf(activeId)
    const overIndex = typeof over.id === 'number' ? items.indexOf(Number(over.id)) : items.length - 1

    const reordered =
      activeIndex >= 0 && overIndex >= 0 && activeIndex !== overIndex
        ? arrayMove(items, activeIndex, overIndex)
        : items

    setDragOverride((prev) => ({ ...(prev ?? baseColumns), [container]: reordered }))

    try {
      await reorder(container, reordered)
    } catch (err) {
      console.error('Failed to save meal plan order', err)
    } finally {
      setDragOverride(null)
    }
  }

  function openRecipe(recipeId: number) {
    navigate(`/recipes/${recipeId}`)
  }

  async function handleRemove(id: number) {
    try {
      await remove(id)
    } catch (err) {
      console.error('Failed to remove meal plan entry', err)
    }
  }

  async function handleSelectRecipe(recipeId: number) {
    if (!addingDate) return
    setAddSubmitting(true)
    setAddError(null)
    try {
      await create({ date: addingDate, recipe_id: recipeId })
      setAddingDate(null)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong, please try again')
    } finally {
      setAddSubmitting(false)
    }
  }

  async function handleAddNote(note: string) {
    if (!addingDate) return
    setAddSubmitting(true)
    setAddError(null)
    try {
      await create({ date: addingDate, note })
      setAddingDate(null)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Something went wrong, please try again')
    } finally {
      setAddSubmitting(false)
    }
  }

  // Infinite scroll (full variant only): grow the loaded window as the user
  // scrolls the row's scroll container near its end, in either axis (the
  // container switches from horizontal scroll to a vertical stack on
  // mobile, but IntersectionObserver clipping works the same either way).
  const scrollRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isTile) return
    const root = scrollRef.current
    const sentinel = sentinelRef.current
    if (!root || !sentinel) return

    const observer = new IntersectionObserver(
      (observerEntries) => {
        if (observerEntries[0]?.isIntersecting) {
          setDaysLoaded((prev) => prev + PAGE_DAYS)
        }
      },
      { root, rootMargin: '400px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [isTile])

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <div
        className={styles.header}
        onClick={isTile ? onExpand : undefined}
        role={isTile && onExpand ? 'button' : undefined}
        tabIndex={isTile && onExpand ? 0 : undefined}
      >
        <Calendar className={styles.headerIcon} width={32} height={32} strokeWidth={1.7} />
        <h2>Meal planner</h2>
        <span className={styles.count}>{entries.length} planned</span>
        {!isTile && (
          <button
            type="button"
            className="button button-secondary"
            onClick={() => navigate('/')}
            aria-label="Back to dashboard"
            title="Back"
          >
            <NavArrowLeft width={14} height={14} strokeWidth={2.2} />
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div ref={scrollRef} className={styles.row}>
            {days.map((day) => (
              <MealPlanDay
                key={day}
                date={day}
                todayIso={todayIso}
                entries={(columns[day] ?? []).map((id) => entriesById.get(id)).filter((e) => e != null)}
                onOpenRecipe={openRecipe}
                onRemove={handleRemove}
                onAdd={setAddingDate}
              />
            ))}
            {!isTile && <div ref={sentinelRef} className={styles.sentinel} aria-hidden="true" />}
          </div>
        </DndContext>
      )}

      {isTile && (
        <button type="button" className={styles.seeAll} onClick={onExpand}>
          See more
        </button>
      )}

      {addingDate && (
        <div className={styles.overlay} onClick={() => setAddingDate(null)}>
          <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
            <MealPlanAddForm
              dayLabel={formatDayLabel(addingDate, todayIso)}
              onSelectRecipe={handleSelectRecipe}
              onAddNote={handleAddNote}
              onCancel={() => setAddingDate(null)}
              submitting={addSubmitting}
              error={addError}
            />
          </div>
        </div>
      )}
    </div>
  )
}
