import { Cart, Collapse, Expand } from 'iconoir-react'
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
}

export function ShoppingListWidget({ variant = 'full', onExpand, onCollapse }: ShoppingListWidgetProps) {
  const isTile = variant === 'tile'

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

      <p className={styles.empty}>Shopping list coming soon.</p>
    </div>
  )
}
