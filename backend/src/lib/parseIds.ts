import type { FastifyReply } from 'fastify'

/**
 * Parses a `?ids=1,2,3` query param into numbers, sending a 400 and
 * returning null if it's missing or contains anything non-numeric.
 */
export function parseIdsQuery(ids: string | undefined, reply: FastifyReply): number[] | null {
  if (!ids) {
    reply.code(400)
    reply.send({ error: 'ids query parameter is required' })
    return null
  }

  const parsed = ids.split(',').map(Number)
  if (parsed.some(Number.isNaN)) {
    reply.code(400)
    reply.send({ error: 'ids must be a comma-separated list of numbers' })
    return null
  }

  return parsed
}
