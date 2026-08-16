import { useMemo, useState } from 'react'
import { Cart, CheckCircle, CheckCircleSolid, Collapse, Expand, Plus } from 'iconoir-react'
import { useShoppingList } from '../../hooks/useShoppingList'
import { ShoppingListItem } from './ShoppingListItem'
import { ShoppingListForm } from './ShoppingListForm'
import type { ShoppingListFormValues } from './ShoppingListForm'
import type { ShoppingListItem as ShoppingListItemType } from '../../api/shoppingList'
import styles from './ShoppingListWidget.module.css'

interface ShoppingListWidgetProps {
  /**
   * 'full' renders the standalone app view; 'tile' renders a compact,
   * height-limited card meant to sit on the dashboard.
   */
  variant?: 'tile' | 'full'
  /** Called when a tile-variant widget wants to become the full view. */
  onExpand?: () => void
  /** Called when a full-variant widget wants to return to the dashboard. */
  onCollapse?: () => void
  /** How many rows to show before offering "see all" in tile mode. */
  maxTileItems?: number
}

export function ShoppingListWidget({ variant = 'full', onExpand, onCollapse, maxTileItems = 4 }: ShoppingListWidgetProps) {
  const { items, units, loading, error, create, update, complete, remove } = useShoppingList()

  const [formOpen, setFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingListItemType | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [showCompleted, setShowCompleted] = useState(false)

  const isTile = variant === 'tile'

  const activeItems = useMemo(() => items.filter((i) => i.active), [items])
  const completedItems = useMemo(() => items.filter((i) => !i.active), [items])
  const baseItems = showCompleted ? completedItems : activeItems
  const visibleItems = isTile ? baseItems.slice(0, maxTileItems) : baseItems

  function openCreateForm() {
    setEditingItem(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEditForm(item: ShoppingListItemType) {
    setEditingItem(item)
    setFormError(null)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingItem(null)
    setFormError(null)
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
      setFormError(err instanceof Error ? err.message : 'Something went wrong, please try again')
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
      setFormError(err instanceof Error ? err.message : 'Something went wrong, please try again')
    } finally {
      setFormSubmitting(false)
    }
  }

  return (
    <div className={`${styles.widget} ${isTile ? styles.tile : styles.full}`}>
      <div
        className={styles.header}
        onClick={isTile ? onExpand : undefined}
        role={isTile && onExpand ? 'button' : undefined}
        tabIndex={isTile && onExpand ? 0 : undefined}
      >
        <Cart className={styles.headerIcon} width={32} height={32} strokeWidth={1.7} />
        <h1 className={styles.title}>Shopping list</h1>
        <span className={styles.count}>{activeItems.length} items</span>
        <button
          type="button"
          className={`button button-secondary ${styles.showCompletedButton}`}
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
        <button
          type="button"
          className="button button-primary"
          onClick={(event) => {
            event.stopPropagation()
            openCreateForm()
          }}
        >
          <Plus width={14} height={14} strokeWidth={2.2} />
          New
        </button>
        {isTile && onExpand && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={(event) => {
              event.stopPropagation()
              onExpand()
            }}
            aria-label="Expand to full screen"
            title="Expand"
          >
            <Expand width={16} height={16} strokeWidth={1.8} />
          </button>
        )}
        {!isTile && onCollapse && (
          <button
            type="button"
            className={styles.iconButton}
            onClick={onCollapse}
            aria-label="Back to dashboard"
            title="Collapse"
          >
            <Collapse width={16} height={16} strokeWidth={1.8} />
          </button>
        )}
      </div>

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
          See all {baseItems.length}
        </button>
      )}

      {formOpen && (
        <div className={styles.overlay} onClick={closeForm}>
          <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
            <ShoppingListForm
              initialItem={editingItem}
              units={units}
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
              onDelete={editingItem ? handleDelete : undefined}
              submitting={formSubmitting}
              error={formError}
            />
          </div>
        </div>
      )}
    </div>
  )
}
