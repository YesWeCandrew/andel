import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TodoWidget } from '../Todo/TodoWidget'
import { ShoppingListWidget } from '../ShoppingList/ShoppingListWidget'
import { RecipeWidget } from '../Recipe/RecipeWidget'
import { MealPlanWidget } from '../MealPlan/MealPlanWidget'
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

      <div className={styles.columns}>
        <div className={styles.column}>
          <TodoWidget variant="tile" onExpand={() => navigate('/todo')} />
          <ShoppingListWidget variant="tile" onExpand={() => navigate('/shoppinglist')} />
        </div>
        <div className={styles.column}>
          <MealPlanWidget variant="tile" onExpand={() => navigate('/mealplan')} />
          <RecipeWidget variant="tile" onExpand={() => navigate('/recipes')} />
        </div>
      </div>
    </div>
  )
}
