import { Check } from 'iconoir-react'
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
      </button>
    </li>
  )
}
