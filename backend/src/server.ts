import Fastify from 'fastify'

// routes
import { todoRoutes } from './routes/todo.ts'
import { todo_logRoutes } from './routes/todo_log.ts'

const app = Fastify({ logger: true })

app.listen({ port: 3000 }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})

app.register(todoRoutes)
app.register(todo_logRoutes)