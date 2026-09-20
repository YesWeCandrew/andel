import { NavArrowLeft } from 'iconoir-react'
import { useNavigate } from 'react-router-dom'
import type { ComponentType, ReactNode } from 'react'
import styles from './WidgetHeader.module.css'

interface IconProps {
  className?: string
  width?: number
  height?: number
  strokeWidth?: number
}

interface WidgetHeaderProps {
  icon: ComponentType<IconProps>
  title: string
  count: string
  isTile: boolean
  /** Called when a tile-variant header is clicked to expand it. */
  onExpand?: () => void
  /** Feature-specific action buttons, rendered between the count and the back button. */
  children?: ReactNode
}

/**
 * Shared header row for every dashboard widget (Todo, ShoppingList, Recipe,
 * MealPlan): icon, title, count, then feature-specific actions, then — in
 * the full-page variant only — a back-to-dashboard button. In tile mode the
 * whole row expands the tile when clicked.
 */
export function WidgetHeader({ icon: Icon, title, count, isTile, onExpand, children }: WidgetHeaderProps) {
  const navigate = useNavigate()
  const clickable = isTile && Boolean(onExpand)

  return (
    <div
      className={`${styles.header} ${clickable ? styles.clickable : ''}`}
      onClick={clickable ? onExpand : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      <Icon className={styles.headerIcon} width={32} height={32} strokeWidth={1.7} />
      <h2>{title}</h2>
      <span className={styles.count}>{count}</span>
      {children}
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
  )
}
