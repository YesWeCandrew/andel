import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Dashboard } from './components/Dashboard/Dashboard'
import { TodoWidget } from './components/Todo/TodoWidget'
import { ShoppingListWidget } from './components/ShoppingList/ShoppingListWidget'
import { RecipeWidget } from './components/Recipe/RecipeWidget'
import { RecipeDetail } from './components/Recipe/RecipeDetail'
import { MealPlanWidget } from './components/MealPlan/MealPlanWidget'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <main className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/todo" element={<TodoWidget variant="full" />} />
          <Route path="/todo/:id" element={<TodoWidget variant="full" />} />
          <Route path="/shoppinglist" element={<ShoppingListWidget variant="full" />} />
          <Route path="/shoppinglist/:id" element={<ShoppingListWidget variant="full" />} />
          <Route path="/recipes" element={<RecipeWidget variant="full" />} />
          <Route path="/recipes/new" element={<RecipeWidget variant="full" />} />
          <Route path="/recipes/:id" element={<RecipeDetail />} />
          <Route path="/recipes/:id/edit" element={<RecipeDetail />} />
          <Route path="/mealplan" element={<MealPlanWidget variant="full" />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
