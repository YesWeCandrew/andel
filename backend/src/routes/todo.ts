// src/routes/todos.ts
import type { FastifyInstance } from 'fastify'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db.ts'
import { todo, todo_log } from '../schema.ts'
import type { CreateTodoInput, UpdateTodoInput } from '../../../shared/todo.ts'

export async function todoRoutes(app: FastifyInstance) {

  // GET /todo — list all todos
  app.get('/todo', async (request, reply) => {
    const todos = await db.select().from(todo)
    return todos
  })

  // POST /todo — create a new todo
  app.post('/todo', async (request, reply) => {
    const body = request.body as CreateTodoInput

    const [newTodo] = await db.insert(todo).values({
      title: body.title,
      active: true,
      emoji: body.emoji,
      notes: body.notes,
      frequency_days: body.frequency_days,
      next_completion_on: body.start_on ? new Date(body.start_on) : undefined,
      created_on: new Date()
    }).returning()

    reply.code(201)
    return newTodo
  })

  // PATCH /todo/:id — update an existing todo
  app.patch('/todo/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as UpdateTodoInput

    const [updated] = await db.update(todo)
      .set(body)
      .where(eq(todo.id, Number(id)))
      .returning()

    if (!updated) {
      reply.code(404)
      return { error: 'Todo not found' }
    }

    return updated
  })

  // POST /todo/:id/complete — mark a todo as complete
  app.post('/todo/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string }
    const todoId = Number(id)

    const [existing] = await db.select().from(todo).where(eq(todo.id, todoId))

    if (!existing) {
      reply.code(404)
      return { error: 'Todo not found' }
    }

    const now = new Date()

    await db.insert(todo_log).values({
      todo_id: todoId,
      completed_on: now
    })

    const [updated] = await db.update(todo)
      .set(
        existing.frequency_days != null
          ? { next_completion_on: new Date(now.getTime() + existing.frequency_days * 24 * 60 * 60 * 1000) }
          : { active: false }
      )
      .where(eq(todo.id, todoId))
      .returning()

    return updated
  })

  // DELETE /todo?ids=1,2,3 — delete a list of todos
  app.delete('/todo', async (request, reply) => {
    const { ids } = request.query as { ids?: string }

    if (!ids) {
      reply.code(400)
      return { error: 'ids query parameter is required' }
    }

    const todoIds = ids.split(',').map(Number)

    if (todoIds.some(Number.isNaN)) {
      reply.code(400)
      return { error: 'ids must be a comma-separated list of numbers' }
    }

    const deleted = await db.delete(todo)
      .where(inArray(todo.id, todoIds))
      .returning()

    return deleted
  })
}