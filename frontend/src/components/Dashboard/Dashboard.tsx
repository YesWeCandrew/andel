import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TodoWidget } from '../Todo/TodoWidget'
import { ShoppingListWidget } from '../ShoppingList/ShoppingListWidget'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatDisplayDate, formatDisplayTime, getGreeting } from './dashboardHelpers'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())

  usePageTitle('Home')

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])

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

      <TodoWidget variant="tile" onExpand={() => navigate('/todo')} />
      <ShoppingListWidget variant="tile" onExpand={() => navigate('/shoppinglist')} />
    </div>
  )
}
