import { Check } from 'iconoir-react'
import { useNavigate } from 'react-router-dom'
import type { ShoppingListItem as ShoppingListItemType } from '../../api/shoppingList'
import { formatItemQuantity } from './shoppingListHelpers'
import styles from './ShoppingListItem.module.css'

interface ShoppingListItemProps {
  item: ShoppingListItemType
  /** True while a complete request for this item is in flight. */
  completing?: boolean
  onComplete: (id: number) => void
  onEdit: (item: ShoppingListItemType) => void
}

export function ShoppingListItem({ item, completing = false, onComplete, onEdit }: ShoppingListItemProps) {
  const navigate = useNavigate()

  function handleSourceTagClick(event: React.MouseEvent, recipeId: number) {
    event.stopPropagation()
    navigate(`/recipes/${recipeId}`)
  }

  return (
    <li className={styles.item}>
      <button
        type="button"
        className={`${styles.tile} ${completing ? styles.tileDone : ''}`}
        disabled={completing || !item.active}
        onClick={() => onComplete(item.id)}
        aria-label={`Mark "${item.product}" as bought`}
        title={item.active ? 'Mark as bought' : 'Already bought'}
      >
        {completing && <Check width={20} height={20} strokeWidth={2} />}
      </button>

      <button type="button" className={styles.body} onClick={() => onEdit(item)}>
        <span className={`${styles.title} ${completing ? styles.titleDone : ''}`}>
          <span className={styles.quantity}>{formatItemQuantity(item)}</span> {item.product}
        </span>
        {item.sources.length > 0 && (
          <span className={styles.tags}>
            {item.sources.map((source, index) =>
              source.recipeId !== null ? (
                <span
                  key={`recipe-${source.recipeId}-${index}`}
                  className={`tag ${styles.sourceTag}`}
                  onClick={(event) => handleSourceTagClick(event, source.recipeId!)}
                >
                  {source.recipeName}
                </span>
              ) : (
                <span key={`manual-${index}`} className="tag">
                  Manual
                </span>
              ),
            )}
          </span>
        )}
      </button>
    </li>
  )
}
