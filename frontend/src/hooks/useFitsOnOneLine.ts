import { useCallback, useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'

/**
 * Whether an element's children fit side by side on a single line.
 *
 * `oneLineClass` must lay the children out in one non-wrapping row. To
 * measure, the hook briefly adds that class, checks whether the last child
 * overflows the element's content box, then restores the element — all
 * synchronously, so the probe is never painted. Because it always measures
 * the one-line layout (never whatever fallback is currently showing), the
 * result can't flip-flop between the two.
 *
 * Re-measures after every render (labels and counts change width) and
 * whenever the element resizes.
 */
export function useFitsOnOneLine(ref: RefObject<HTMLElement | null>, oneLineClass: string, enabled = true) {
  const [fits, setFits] = useState(true)

  const measure = useCallback(() => {
    const el = ref.current
    const last = el?.lastElementChild
    if (!el || !last) return

    const hadClass = el.classList.contains(oneLineClass)
    el.classList.add(oneLineClass)
    const style = getComputedStyle(el)
    const contentRight =
      el.getBoundingClientRect().right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth)
    // 1px of slack absorbs sub-pixel rounding when the row fits exactly.
    const next = last.getBoundingClientRect().right <= contentRight + 1
    if (!hadClass) el.classList.remove(oneLineClass)

    setFits(next)
  }, [ref, oneLineClass])

  useLayoutEffect(() => {
    if (enabled) measure()
  })

  useLayoutEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    // Text widths shift once the web font finishes loading.
    document.fonts?.ready.then(measure)
    // ResizeObserver only arrived in Safari 13.1; older iPads fall back to
    // window resizes, which covers rotation and the app's own layout.
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => window.removeEventListener('resize', measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, enabled, measure])

  return enabled && fits
}
