import { useEffect, useState } from 'react'
import { TodoWidget } from '../Todo/TodoWidget'
import { ShoppingListWidget } from '../ShoppingList/ShoppingListWidget'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDisplayDate, formatDisplayTime, getGreeting } from './dashboardHelpers'
import styles from './Dashboard.module.css'

type ExpandedWidget = 'todo' | 'shopping' | null

const PAGE_TITLES = {
  home: 'Home',
  todo: 'To do',
  shopping: 'Shopping list',
} as const

export function Dashboard() {
  const [expanded, setExpanded] = useState<ExpandedWidget>(null)
  const [now, setNow] = useState(() => new Date())

  usePageTitle(PAGE_TITLES[expanded ?? 'home'])

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

  if (expanded === 'todo') {
    return <TodoWidget variant="full" onCollapse={() => setExpanded(null)} />
  }

  if (expanded === 'shopping') {
    return <ShoppingListWidget variant="full" onCollapse={() => setExpanded(null)} />
  }

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <img src="/favicon.svg" alt="Andel" className={styles.logo} />
        <div className={styles.headerText}>
          <p className={styles.greeting}>{getGreeting(now)}</p>
          <p className={styles.date}>{formatDisplayDate(now)}</p>
        </div>
        <p className={styles.time}>{formatDisplayTime(now)}</p>
      </header>

      <TodoWidget variant="tile" onExpand={() => setExpanded('todo')} />
      <ShoppingListWidget variant="tile" onExpand={() => setExpanded('shopping')} />
    </div>
  )
}
