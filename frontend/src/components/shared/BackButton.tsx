import { NavArrowLeft } from 'iconoir-react'
import { useGoBack } from '../../hooks/useGoBack'

interface BackButtonProps {
  /** Where to go if there's no earlier in-app page to return to (e.g. a bookmarked link). */
  fallback: string
}

/** The app's one back button: returns to wherever the user was last. */
export function BackButton({ fallback }: BackButtonProps) {
  const goBack = useGoBack()

  return (
    <button
      type="button"
      className="button button-secondary"
      onClick={(event) => {
        event.stopPropagation()
        goBack(fallback)
      }}
      aria-label="Back"
      title="Back"
    >
      <NavArrowLeft width={14} height={14} strokeWidth={2.2} />
    </button>
  )
}
