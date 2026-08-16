// src/routes/unit.ts
import type { FastifyInstance } from 'fastify'
import { asc, eq } from 'drizzle-orm'
import { db } from '../db.ts'
import { unit } from '../schema.ts'

export async function unitRoutes(app: FastifyInstance) {

  // GET /unit — list all units for the shopping list's unit dropdown.
  // New units are created implicitly when an item is added with one
  // (see POST /shopping_list), not through a dedicated endpoint here.
  app.get('/unit', async (request, reply) => {
    const units = await db.select().from(unit).where(eq(unit.active, true)).orderBy(asc(unit.unit))
    return units
  })
}
