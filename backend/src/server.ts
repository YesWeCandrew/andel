import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'

// routes
import { todoRoutes } from './routes/todo.ts'
import { todo_logRoutes } from './routes/todo_log.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = Fastify({ logger: true })

app.register(todoRoutes)
app.register(todo_logRoutes)

// Serve the built frontend (see frontend/Dockerfile build stage, which
// copies its `dist/` output to backend/public at image build time).
app.register(fastifyStatic, {
  root: join(__dirname, '../public'),
})

const port = Number(process.env.PORT ?? 3000)

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
