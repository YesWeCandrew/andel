import type { FastifyReply } from 'fastify'

/**
 * Awaits a single-row select and, if it comes back empty, sends a 404 (using
 * `label`) and returns null — so a route handler can `if (!row) return` and
 * rely on the response already being sent.
 */
export async function findOrNotFound<T>(rows: Promise<T[]>, reply: FastifyReply, label: string): Promise<T | null> {
  const [row] = await rows
  if (!row) {
    reply.code(404)
    reply.send({ error: `${label} not found` })
    return null
  }
  return row
}
