// src/routes/todos.ts
import type { FastifyInstance } from 'fastify'
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '../db.ts'
import { todo, todo_log } from '../schema.ts'
import { findOrNotFound } from '../lib/notFound.ts'
import { parseIdsQuery } from '../lib/parseIds.ts'
import type { UpsertTodoInput } from '../../../shared/todo.ts'

export async function todoRoutes(app: FastifyInstance) {

  // GET /todo — list all todos
  app.get('/todo', async (request, reply) => {
    const todos = await db.select().from(todo).orderBy(asc(todo.next_completion_on))
    return todos
  })

  // POST /todo — create a new todo
  app.post('/todo', async (request, reply) => {
    const body = request.body as UpsertTodoInput

    const [newTodo] = await db.insert(todo).values({
      title: body.title ? body.title : 'New reminder',
      active: body.active,
      emoji: body.emoji,
      notes: body.notes,
      frequency_days: body.frequency_days,
      next_completion_on: body.next_completion_on ? new Date(body.next_completion_on) : undefined,
      created_on: new Date()
    }).returning()

    reply.code(201)
    return newTodo
  })

  // PATCH /todo/:id — update an existing todo
  app.patch('/todo/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const body = request.body as UpsertTodoInput

    const updated = await findOrNotFound(
      db.update(todo)
        .set({
          title: body.title ? body.title : 'New reminder',
          active: body.active,
          emoji: body.emoji,
          notes: body.notes,
          frequency_days: body.frequency_days,
          next_completion_on: body.next_completion_on ? new Date(body.next_completion_on) : undefined,
        })
        .where(eq(todo.id, Number(id)))
        .returning(),
      reply,
      'Todo',
    )
    if (!updated) return

    return updated
  })

  // POST /todo/:id/complete — mark a todo as complete
  app.post('/todo/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string }
    const todoId = Number(id)

    const existing = await findOrNotFound(db.select().from(todo).where(eq(todo.id, todoId)), reply, 'Todo')
    if (!existing) return

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

    const todoIds = parseIdsQuery(ids, reply)
    if (!todoIds) return

    await db.delete(todo_log)
      .where(inArray(todo_log.todo_id, todoIds))

    const deleted = await db.delete(todo)
      .where(inArray(todo.id, todoIds))
      .returning()

    return deleted
  })
}