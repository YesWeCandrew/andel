import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar } from 'iconoir-react'
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
import { getErrorMessage } from '../../lib/errors'
import { WidgetHeader } from '../shared/WidgetHeader'
import { FormOverlay } from '../shared/FormOverlay'
import styles from './MealPlanWidget.module.css'

const TILE_DAYS = 3
const PAGE_DAYS = 14
// Smaller than PAGE_DAYS: backward paging is triggered by raw wheel/touch
// deltas rather than an IntersectionObserver, so a big page makes it very
// easy to way overshoot into the past with one scroll gesture.
const BACK_PAGE_DAYS = 3

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
  // Days loaded before today (full variant only) — stays 0 until the user
  // scrolls/swipes past the start of the row, at which point it grows in
  // PAGE_DAYS steps (see the wheel/touch handlers below).
  const [daysBefore, setDaysBefore] = useState(0)
  const visibleDayCount = isTile ? TILE_DAYS : daysLoaded
  const startIso = useMemo(() => addDaysISO(todayIso, -daysBefore), [todayIso, daysBefore])
  const endIso = useMemo(() => addDaysISO(todayIso, visibleDayCount - 1), [todayIso, visibleDayCount])

  const { entries, loading, error, create, remove, reorder } = useMealPlan(startIso, endIso)

  // Every mutation and every infinite-scroll page-in re-triggers `loading`
  // (useMealPlan refetches the whole range rather than patching locally), so
  // only the very first load should swap the row out for a placeholder —
  // otherwise the scroll container would remount, and with it the scroll
  // position, on every add/remove/reorder/page-in.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!loading) setHasLoadedOnce(true)
  }, [loading])

  const days = useMemo(
    () => Array.from({ length: daysBefore + visibleDayCount }, (_, i) => addDaysISO(todayIso, i - daysBefore)),
    [todayIso, visibleDayCount, daysBefore],
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
      setAddError(getErrorMessage(err, 'Something went wrong, please try again'))
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
      setAddError(getErrorMessage(err, 'Something went wrong, please try again'))
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

  // Backward scroll (full variant only): there's nothing before today to
  // observe with an IntersectionObserver (the row already starts there), so
  // instead we watch for the user pushing past the start — a wheel/trackpad
  // scroll or touch drag "backward" while already at the row's start edge —
  // and load another page of past days on demand.
  const prevScrollSizeRef = useRef<{ width: number; height: number } | null>(null)
  const loadingPastRef = useRef(false)
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  function loadPastDays() {
    const root = scrollRef.current
    if (isTile || !root || loadingPastRef.current) return
    loadingPastRef.current = true
    prevScrollSizeRef.current = { width: root.scrollWidth, height: root.scrollHeight }
    setDaysBefore((prev) => prev + BACK_PAGE_DAYS)
  }

  function handleWheel(event: React.WheelEvent<HTMLDivElement>) {
    const root = scrollRef.current
    if (!root || root.scrollLeft > 0 || root.scrollTop > 0) return
    const delta = Math.abs(event.deltaX) >= Math.abs(event.deltaY) ? event.deltaX : event.deltaY
    if (delta < 0) loadPastDays()
  }

  function handleTouchStart(event: React.TouchEvent<HTMLDivElement>) {
    const touch = event.touches[0]
    touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null
  }

  function handleTouchMove(event: React.TouchEvent<HTMLDivElement>) {
    const root = scrollRef.current
    const start = touchStartRef.current
    const touch = event.touches[0]
    if (!root || !start || !touch || root.scrollLeft > 0 || root.scrollTop > 0) return
    if (touch.clientX - start.x > 0 || touch.clientY - start.y > 0) loadPastDays()
  }

  // Prepending columns shifts everything already on screen, so we snapshot
  // the scrollable size just before growing (above) and re-apply the delta
  // here, keeping whatever the user was looking at in the same place
  // instead of jumping.
  useLayoutEffect(() => {
    const root = scrollRef.current
    const prev = prevScrollSizeRef.current
    if (root && prev) {
      root.scrollLeft += root.scrollWidth - prev.width
      root.scrollTop += root.scrollHeight - prev.height
    }
    prevScrollSizeRef.current = null
    loadingPastRef.current = false
  }, [daysBefore])

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <WidgetHeader icon={Calendar} title="Meal planner" count={`${entries.length} planned`} isTile={isTile} onExpand={onExpand} />

      {error && <p className={styles.error}>{error}</p>}

      {loading && !hasLoadedOnce ? (
        <p className={styles.empty}>Loading…</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div
            ref={scrollRef}
            className={styles.row}
            onWheel={isTile ? undefined : handleWheel}
            onTouchStart={isTile ? undefined : handleTouchStart}
            onTouchMove={isTile ? undefined : handleTouchMove}
          >
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
        <FormOverlay onClose={() => setAddingDate(null)} maxWidth={480} align="top">
          <MealPlanAddForm
            dayLabel={formatDayLabel(addingDate, todayIso)}
            onSelectRecipe={handleSelectRecipe}
            onAddNote={handleAddNote}
            onCancel={() => setAddingDate(null)}
            submitting={addSubmitting}
            error={addError}
          />
        </FormOverlay>
      )}
    </div>
  )
}
