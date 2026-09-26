import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Cart, CheckCircle, CheckCircleSolid } from 'iconoir-react'
import { useShoppingList } from '../../hooks/useShoppingList'
import { ShoppingListItem } from './ShoppingListItem'
import { ShoppingListForm } from './ShoppingListForm'
import type { ShoppingListFormValues } from './ShoppingListForm'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useGoBack } from '../../hooks/useGoBack'
import { getErrorMessage } from '../../lib/errors'
import { WidgetHeader } from '../shared/WidgetHeader'
import { NewButton } from '../shared/NewButton'
import { FormOverlay } from '../shared/FormOverlay'
import styles from './ShoppingListWidget.module.css'

interface ShoppingListWidgetProps {
  /**
   * 'full' renders the standalone app view; 'tile' renders a compact,
   * height-limited card meant to sit on the dashboard.
   */
  variant?: 'tile' | 'full'
  /** Called when a tile-variant widget wants to become the full view. */
  onExpand?: () => void
  /** How many rows to show before offering "see all" in tile mode. */
  maxTileItems?: number
}

export function ShoppingListWidget({ variant = 'full', onExpand, maxTileItems = 3 }: ShoppingListWidgetProps) {
  const { items, units, loading, error, create, update, complete, remove } = useShoppingList()
  const navigate = useNavigate()
  const goBack = useGoBack()
  const location = useLocation()
  const { id: idParam } = useParams<{ id?: string }>()

  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)

  const isTile = variant === 'tile'
  usePageTitle(isTile ? undefined : 'Shopping list')

  // Route-derived form state: /shoppinglist/new opens the create form,
  // /shoppinglist/:id opens that item for editing (full variant only). On
  // the dashboard tile, "New" instead opens the same form in place via
  // history state, so the URL stays on "/" but the browser back button
  // still closes it.
  const tileNewFormOpen = isTile && Boolean((location.state as { newItem?: boolean } | null)?.newItem)
  // Wait for items to finish loading before opening an existing-item edit —
  // otherwise the form mounts against an empty list, resolves no match, and
  // renders as a blank "new" form that never recovers once the data arrives.
  const fullFormOpen = !isTile && idParam !== undefined && (idParam === 'new' || !loading)
  const formOpen = fullFormOpen || tileNewFormOpen
  const editingItem = idParam && idParam !== 'new' ? (items.find((i) => String(i.id) === idParam) ?? null) : null

  // If a linked/bookmarked id doesn't match a real item once loading finishes, bounce back to the list.
  useEffect(() => {
    if (!isTile && idParam && idParam !== 'new' && !loading && !editingItem) {
      navigate('/shoppinglist', { replace: true })
    }
  }, [isTile, idParam, loading, editingItem, navigate])

  const activeItems = useMemo(() => items.filter((i) => i.active), [items])
  const completedItems = useMemo(() => items.filter((i) => !i.active), [items])
  const baseItems = showCompleted ? completedItems : activeItems
  const visibleItems = isTile ? baseItems.slice(0, maxTileItems) : baseItems

  function openCreateForm() {
    setFormError(null)
    if (isTile) {
      navigate(location.pathname, { state: { newItem: true } })
    } else {
      navigate('/shoppinglist/new')
    }
  }

  function openEditForm(item: { id: number }) {
    setFormError(null)
    navigate(`/shoppinglist/${item.id}`)
  }

  function closeForm() {
    setFormError(null)
    // Pop the history entry the form was opened with, rather than pushing
    // another one, so the back button doesn't have to step over it.
    goBack(isTile ? location.pathname : '/shoppinglist')
  }

  async function handleComplete(id: number) {
    setPendingIds((prev) => new Set(prev).add(id))
    try {
      await complete(id)
    } catch (err) {
      console.error('Failed to mark item as bought', err)
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  async function handleDelete() {
    if (!editingItem) return
    setFormSubmitting(true)
    setFormError(null)
    try {
      await remove([editingItem.id])
      closeForm()
    } catch (err) {
      setFormError(getErrorMessage(err, 'Something went wrong, please try again'))
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleFormSubmit(values: ShoppingListFormValues) {
    setFormSubmitting(true)
    setFormError(null)
    try {
      if (editingItem) {
        await update(editingItem.id, values)
      } else {
        await create(values)
      }
      closeForm()
    } catch (err) {
      setFormError(getErrorMessage(err, 'Something went wrong, please try again'))
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <WidgetHeader
        icon={Cart}
        title="Shopping list"
        count={`${activeItems.length} items`}
        isTile={isTile}
        onExpand={onExpand}
        primaryAction={<NewButton onClick={openCreateForm} />}
      >
        <button
          type="button"
          className="button button-secondary"
          onClick={(event) => {
            event.stopPropagation()
            setShowCompleted((prev) => !prev)
          }}
        >
          {showCompleted ? (
            <CheckCircle width={14} height={14} strokeWidth={2.2} />
          ) : (
            <CheckCircleSolid width={14} height={14} strokeWidth={2.2} />
          )}
          {showCompleted ? 'Show active' : 'Show bought'}
        </button>
      </WidgetHeader>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <p className={styles.empty}>Loading…</p>
      ) : visibleItems.length === 0 ? (
        <p className={styles.empty}>
          {showCompleted ? 'Nothing bought yet.' : 'The shopping list is empty.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {visibleItems.map((item) => (
            <ShoppingListItem
              key={item.id}
              item={item}
              completing={pendingIds.has(item.id)}
              onComplete={handleComplete}
              onEdit={openEditForm}
            />
          ))}
        </ul>
      )}

      {isTile && baseItems.length > maxTileItems && (
        <button type="button" className={styles.seeAll} onClick={onExpand}>
          See {baseItems.length - maxTileItems} other items
        </button>
      )}

      {formOpen && (
        <FormOverlay onClose={closeForm}>
          <ShoppingListForm
            key={idParam}
            initialItem={editingItem}
            units={units}
            onSubmit={handleFormSubmit}
            onCancel={closeForm}
            onDelete={editingItem ? handleDelete : undefined}
            submitting={formSubmitting}
            error={formError}
          />
        </FormOverlay>
      )}
    </div>
  )
}
