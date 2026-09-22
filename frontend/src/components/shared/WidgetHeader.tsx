import type { ComponentType, ReactNode } from 'react'
import { BackButton } from './BackButton'
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
 * the full-page variant only — a back button. In tile mode the
 * whole row expands the tile when clicked.
 */
export function WidgetHeader({ icon: Icon, title, count, isTile, onExpand, children }: WidgetHeaderProps) {
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
      {!isTile && <BackButton fallback="/" />}
    </div>
  )
}
