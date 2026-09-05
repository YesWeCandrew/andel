import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'

// routes
import { todoRoutes } from './routes/todo.ts'
import { todo_logRoutes } from './routes/todo_log.ts'
import { shoppingListRoutes } from './routes/shopping_list.ts'
import { productRoutes } from './routes/product.ts'
import { unitRoutes } from './routes/unit.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = Fastify({ logger: true })


app.register(todoRoutes, { prefix: '/api' })
app.register(todo_logRoutes, { prefix: '/api' })
app.register(shoppingListRoutes, { prefix: '/api' })
app.register(productRoutes, { prefix: '/api' })
app.register(unitRoutes, { prefix: '/api' })

// Serve the built frontend (see frontend/Dockerfile build stage, which
// copies its `dist/` output to backend/public at image build time).
app.register(fastifyStatic, {
  root: join(__dirname, '../public'),
})

// The frontend is a client-side-routed SPA (/, /todo, /todo/:id,
// /shoppinglist, /shoppinglist/:id), so any GET that didn't match an API
// route or a static asset above is a client route — hand back index.html
// and let the router in the browser resolve it.
app.setNotFoundHandler((request, reply) => {
  if (request.method === 'GET') {
    reply.sendFile('index.html')
    return
  }
  reply.code(404).send({ message: 'Not found' })
})

const port = Number(process.env.PORT ?? 3000)

app.listen({ port, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err)
    process.exit(1)
  }
  console.log(`Server listening at ${address}`)
})
