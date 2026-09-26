import { useRef } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { BackButton } from './BackButton'
import { useFitsOnOneLine } from '../../hooks/useFitsOnOneLine'
import styles from './WidgetHeader.module.css'

interface IconProps {
  className?: string
  width?: number
  height?: number
  strokeWidth?: number
}

interface WidgetHeaderProps {
  icon?: ComponentType<IconProps>
  title: string
  /** Summary text such as "3 due" — only shown in the full view. */
  count?: string
  isTile: boolean
  /** Called when a tile-variant header is clicked to expand it. */
  onExpand?: () => void
  /** Where the back button goes if there's no earlier in-app page to return to. */
  backFallback?: string
  /** Drop the header's own padding, for pages whose container already pads it. */
  flush?: boolean
  /** The widget's main action (e.g. "+ New") — the only action shown on a dashboard tile. */
  primaryAction?: ReactNode
  /** Secondary actions, shown in the full view only, before the primary action. */
  children?: ReactNode
}

/**
 * Shared header for every widget (Todo, ShoppingList, Recipe, MealPlan) and
 * the recipe detail page: icon, title, count, then feature-specific actions,
 * then a back button.
 *
 * A dashboard tile shows just the icon, title and primary action on one
 * line, and the whole header expands the tile when clicked.
 *
 * The full view adds the count, secondary actions and back button. When it
 * all fits on one line the actions sit at full size to the right of the
 * title; otherwise they drop to their own line under the header, shrunk to
 * tag height, and the count moves to the right of the title row.
 */
export function WidgetHeader({
  icon: Icon,
  title,
  count,
  isTile,
  onExpand,
  backFallback = '/',
  flush = false,
  primaryAction,
  children,
}: WidgetHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null)
  // Tiles only carry the one primary action, so they always fit on one line.
  const fits = useFitsOnOneLine(headerRef, styles.oneLine, !isTile)
  const oneLine = isTile || fits
  const clickable = isTile && Boolean(onExpand)
  const hasActions = !isTile || primaryAction != null

  const className = [
    styles.header,
    oneLine && styles.oneLine,
    clickable && styles.clickable,
    flush && styles.flush,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      ref={headerRef}
      className={className}
      onClick={clickable ? onExpand : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
    >
      {Icon && <Icon className={styles.headerIcon} width={32} height={32} strokeWidth={1.7} />}
      <h2 className={styles.title}>{title}</h2>
      {!isTile && count && <span className={styles.count}>{count}</span>}
      {hasActions && (
        <div className={styles.actions}>
          {!isTile && children}
          {primaryAction}
          {!isTile && <BackButton fallback={backFallback} />}
        </div>
      )}
    </div>
  )
}
