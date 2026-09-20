// src/routes/todo_log.ts
import type { FastifyInstance } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { db } from '../db.ts'
import { todo_log } from '../schema.ts'
import { findOrNotFound } from '../lib/notFound.ts'

export async function todo_logRoutes(app: FastifyInstance) {

  // GET /todo_log — list all log entries
  app.get('/todo_log', async (request, reply) => {
    const logs = await db.select().from(todo_log)
    return logs
  })

  // GET /todo_log/:id — get a specific log entry
  // That is not all logs for a todo but a signgle todo log
  app.get('/todo_log/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const log = await findOrNotFound(db.select().from(todo_log).where(eq(todo_log.id, Number(id))), reply, 'Log entry')
    if (!log) return

    return log
  })

  // GET todo/:id/todo_log - gets all logs for a specific todo
  app.get('/todo/:id/todo_log', async (request) => {
    const { id } = request.params as { id: string }
 
    const logs = await db.select().from(todo_log).where(eq(todo_log.todo_id, Number(id))).orderBy(desc(todo_log.completed_on))
    return logs
  })

  // DELETE /todo_log/:id — remove a log entry
  app.delete('/todo_log/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const deleted = await findOrNotFound(
      db.delete(todo_log).where(eq(todo_log.id, Number(id))).returning(),
      reply,
      'Log entry',
    )
    if (!deleted) return

    return deleted
  })
}