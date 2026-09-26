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
const INITIAL_DAYS = 14
// How many days each "See more" row loads, in either direction.
const PAGE_DAYS = 7

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
  const [daysLoaded, setDaysLoaded] = useState(INITIAL_DAYS)
  // Days loaded before today (full variant only) — stays 0 until the user
  // clicks the "See more" row at the top, which grows it in PAGE_DAYS steps.
  const [daysBefore, setDaysBefore] = useState(0)
  const visibleDayCount = isTile ? TILE_DAYS : daysLoaded
  const startIso = useMemo(() => addDaysISO(todayIso, -daysBefore), [todayIso, daysBefore])
  const endIso = useMemo(() => addDaysISO(todayIso, visibleDayCount - 1), [todayIso, visibleDayCount])

  const { entries, loading, error, create, remove, reorder } = useMealPlan(startIso, endIso)

  // Every mutation and every "See more" page-in re-triggers `loading`
  // (useMealPlan refetches the whole range rather than patching locally), so
  // only the very first load should swap the row out for a placeholder —
  // otherwise the list would remount, and with it the scroll position, on
  // every add/remove/reorder/page-in.
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

  // Prepending past days pushes everything already on screen down, so we
  // snapshot the list's position just before growing and re-apply the delta
  // afterwards, keeping whatever the user was looking at in the same place.
  // The list may sit in its own scroll container (tile) or scroll with the
  // page (full), so the offset is measured against the viewport and the
  // correction applied to both.
  const listRef = useRef<HTMLDivElement>(null)
  const firstDayTopRef = useRef<number | null>(null)
  const firstDayRef = useRef<string | null>(null)

  function loadPastDays() {
    const list = listRef.current
    const firstDay = list?.querySelector<HTMLElement>('[data-day]')
    if (firstDay) {
      firstDayRef.current = firstDay.dataset.day ?? null
      firstDayTopRef.current = firstDay.getBoundingClientRect().top
    }
    setDaysBefore((prev) => prev + PAGE_DAYS)
    setShowPastMore(false)
  }

  function loadFutureDays() {
    setDaysLoaded((prev) => prev + PAGE_DAYS)
    setShowFutureMore(false)
  }

  // The "See more?" rows stay hidden until the user tries to scroll/swipe
  // past an end of the list with nowhere further to go. The full view scrolls
  // with the page, so both the window and the list itself must be at that
  // end. Listeners sit on the window so the gesture counts wherever it lands.
  const [showPastMore, setShowPastMore] = useState(false)
  const [showFutureMore, setShowFutureMore] = useState(false)
  const futureMoreRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isTile) return

    function atTop() {
      const list = listRef.current
      return window.scrollY <= 0 && (!list || list.scrollTop <= 0)
    }

    function atBottom() {
      const list = listRef.current
      const doc = document.documentElement
      const windowAtBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 1
      const listAtBottom = !list || list.scrollTop + list.clientHeight >= list.scrollHeight - 1
      return windowAtBottom && listAtBottom
    }

    function handleIntent(direction: number) {
      if (direction < 0 && atTop()) setShowPastMore(true)
      if (direction > 0 && atBottom()) setShowFutureMore(true)
    }

    let touchStartY: number | null = null

    function handleWheel(event: WheelEvent) {
      handleIntent(event.deltaY)
    }

    function handleTouchStart(event: TouchEvent) {
      touchStartY = event.touches[0]?.clientY ?? null
    }

    function handleTouchMove(event: TouchEvent) {
      const y = event.touches[0]?.clientY
      if (touchStartY == null || y == null) return
      // Dragging the finger down scrolls up, and vice versa.
      handleIntent(touchStartY - y)
    }

    window.addEventListener('wheel', handleWheel, { passive: true })
    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isTile])

  // The bottom row appears below the fold, so bring it into view.
  useEffect(() => {
    if (showFutureMore) futureMoreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [showFutureMore])

  useLayoutEffect(() => {
    const list = listRef.current
    const prevTop = firstDayTopRef.current
    const day = firstDayRef.current
    firstDayTopRef.current = null
    firstDayRef.current = null
    if (!list || prevTop == null || !day) return
    const el = list.querySelector<HTMLElement>(`[data-day="${day}"]`)
    if (!el) return
    const delta = el.getBoundingClientRect().top - prevTop
    list.scrollTop += delta
    const remaining = el.getBoundingClientRect().top - prevTop
    if (remaining) window.scrollBy(0, remaining)
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
          <div ref={listRef} className={styles.list}>
            {showPastMore && (
              <button type="button" className={styles.seeMore} onClick={loadPastDays}>
                See more?
              </button>
            )}
            {days.map((day) => (
              <div key={day} data-day={day}>
                <MealPlanDay
                  date={day}
                  todayIso={todayIso}
                  entries={(columns[day] ?? []).map((id) => entriesById.get(id)).filter((e) => e != null)}
                  onOpenRecipe={openRecipe}
                  onRemove={handleRemove}
                  onAdd={setAddingDate}
                />
              </div>
            ))}
            {showFutureMore && (
              <button ref={futureMoreRef} type="button" className={styles.seeMore} onClick={loadFutureDays}>
                See more?
              </button>
            )}
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
