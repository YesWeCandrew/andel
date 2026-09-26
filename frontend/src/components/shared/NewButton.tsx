import { Plus } from 'iconoir-react'

interface NewButtonProps {
  onClick: () => void
}

/** A widget's "+ New" primary action. Doesn't let the click expand a dashboard tile. */
export function NewButton({ onClick }: NewButtonProps) {
  return (
    <button
      type="button"
      className="button button-primary"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
    >
      <Plus width={14} height={14} strokeWidth={2.2} />
      New
    </button>
  )
}
