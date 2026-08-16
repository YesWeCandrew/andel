import { TodoWidget } from './components/Todo/TodoWidget'
import { usePageTitle } from './hooks/usePageTitle'
import './App.css'

function App() {
  usePageTitle('To do')

  return (
    <main className="page">
      <TodoWidget variant="full" />
    </main>
  )
}

export default App
