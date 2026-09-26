// src/routes/unit.ts
import type { FastifyInstance } from 'fastify'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { db } from '../db.ts'
import { product_unit_history, recipe_ingredient, unit } from '../schema.ts'

export async function unitRoutes(app: FastifyInstance) {

  // GET /unit — list all units for the unit pickers, most used first.
  // Usage counts every shopping list add (logged in product_unit_history)
  // plus every recipe ingredient. New units are created implicitly when an
  // item is saved with one (see findOrCreateUnit), not through an endpoint here.
  app.get('/unit', async (request, reply) => {
    const uses = sql<number>`
      (select count(*) from ${product_unit_history} where ${product_unit_history.unit_id} = ${unit.id})
      + (select count(*) from ${recipe_ingredient} where ${recipe_ingredient.unit_id} = ${unit.id})`

    const units = await db.select({ id: unit.id, unit: unit.unit, active: unit.active })
      .from(unit)
      .where(eq(unit.active, true))
      .orderBy(desc(uses), asc(unit.unit))
    return units
  })
}
