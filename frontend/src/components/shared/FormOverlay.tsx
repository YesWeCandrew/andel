import type { MouseEvent, ReactNode } from 'react'
import styles from './FormOverlay.module.css'

interface FormOverlayProps {
  onClose: () => void
  children: ReactNode
  /** Panel width in px — each form picks the width that fits its content. */
  maxWidth?: number
  /** 'center' for short forms; 'top' lets the panel grow past the viewport and scroll with the backdrop. */
  align?: 'center' | 'top'
}

/**
 * Shared modal wrapper for every widget's create/edit form: a dimmed
 * backdrop that closes on click, and a panel that stops that click from
 * bubbling so interacting with the form doesn't close it.
 */
export function FormOverlay({ onClose, children, maxWidth = 400, align = 'center' }: FormOverlayProps) {
  return (
    <div className={`${styles.overlay} ${align === 'top' ? styles.alignTop : ''}`} onClick={onClose}>
      <div
        className={`${styles.panel} ${align === 'top' ? styles.panelAuto : ''}`}
        style={{ width: `min(${maxWidth}px, 100%)` }}
        onClick={(event: MouseEvent) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
