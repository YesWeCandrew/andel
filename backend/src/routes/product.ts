// src/routes/product.ts
import type { FastifyInstance } from 'fastify'
import { and, asc, count, desc, eq, like, sql } from 'drizzle-orm'
import { db } from '../db.ts'
import { product, product_unit_history, unit } from '../schema.ts'
import { findOrNotFound } from '../lib/notFound.ts'
import type { ProductSuggestion } from '../../../shared/shopping_list.ts'

const SUGGESTION_LIMIT = 8

export async function productRoutes(app: FastifyInstance) {

  // GET /product?q=aspar — search products for the shopping list autocomplete,
  // each annotated with the most-used (quantity, unit) pair for that product.
  app.get('/product', async (request, reply) => {
    const { q } = request.query as { q?: string }
    const query = (q ?? '').trim()

    const matches = query
      ? await db.select().from(product)
          .where(and(eq(product.active, true), like(product.product, `%${query}%`)))
          .orderBy(sql`case when ${product.product} like ${query + '%'} then 0 else 1 end`, asc(product.product))
          .limit(SUGGESTION_LIMIT)
      : await db.select().from(product)
          .where(eq(product.active, true))
          .orderBy(asc(product.product))
          .limit(SUGGESTION_LIMIT)

    const suggestions: ProductSuggestion[] = await Promise.all(
      matches.map(async (p) => {
        const [top] = await db.select({
          unit_id: product_unit_history.unit_id,
          unit: unit.unit,
          quantity: product_unit_history.quantity,
          n: count(),
        })
          .from(product_unit_history)
          .leftJoin(unit, eq(product_unit_history.unit_id, unit.id))
          .where(eq(product_unit_history.product_id, p.id))
          .groupBy(product_unit_history.unit_id, product_unit_history.quantity)
          .orderBy(desc(count()))
          .limit(1)

        return {
          id: p.id,
          product: p.product ?? '',
          suggestedQuantity: top?.quantity ?? null,
          suggestedUnitId: top?.unit_id ?? null,
          suggestedUnit: top?.unit ?? null,
        }
      }),
    )

    return suggestions
  })

  // DELETE /product/:id — soft-delete a mistyped/unwanted product so it stops
  // cluttering autocomplete. Existing shopping list items keep their product_id.
  app.delete('/product/:id', async (request, reply) => {
    const { id } = request.params as { id: string }

    const updated = await findOrNotFound(
      db.update(product).set({ active: false }).where(eq(product.id, Number(id))).returning(),
      reply,
      'Product',
    )
    if (!updated) return

    return updated
  })
}
