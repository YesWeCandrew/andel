import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Dashboard } from './components/Dashboard/Dashboard'
import { TodoWidget } from './components/Todo/TodoWidget'
import { ShoppingListWidget } from './components/ShoppingList/ShoppingListWidget'
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
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default App
