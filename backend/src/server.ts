import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import fastifyMultipart from '@fastify/multipart'

// routes
import { todoRoutes } from './routes/todo.ts'
import { todo_logRoutes } from './routes/todo_log.ts'
import { shoppingListRoutes } from './routes/shopping_list.ts'
import { productRoutes } from './routes/product.ts'
import { unitRoutes } from './routes/unit.ts'
import { recipeRoutes } from './routes/recipes.ts'
import { mealPlanRoutes } from './routes/meal_plan.ts'
import { MAX_PHOTO_BYTES, UPLOADS_DIR } from './lib/uploads.ts'
import { registerAuth } from './lib/auth.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = Fastify({ logger: true })

// Before everything else, so it guards the API, uploads and the SPA alike.
registerAuth(app)

app.register(fastifyMultipart, { limits: { fileSize: MAX_PHOTO_BYTES } })

app.register(todoRoutes, { prefix: '/api' })
app.register(todo_logRoutes, { prefix: '/api' })
app.register(shoppingListRoutes, { prefix: '/api' })
app.register(productRoutes, { prefix: '/api' })
app.register(unitRoutes, { prefix: '/api' })
app.register(recipeRoutes, { prefix: '/api' })
app.register(mealPlanRoutes, { prefix: '/api' })

// Serve the built frontend (see frontend/Dockerfile build stage, which
// copies its `dist/` output to backend/public at image build time). This is
// the first-registered static scope, so it's the one that gets the
// `reply.sendFile` decorator used by the SPA fallback below.
app.register(fastifyStatic, {
  root: join(__dirname, '../public'),
})

// Recipe photo uploads — runtime-written state, so it gets its own
// gitignored directory and static scope rather than reusing `public/`
// (which only exists once the frontend's Docker build stage populates it).
// `decorateReply: false` because only one static scope per app may add the
// `reply.sendFile` decorator, and the SPA scope above already claimed it.
mkdirSync(UPLOADS_DIR, { recursive: true })
app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  decorateReply: false,
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
