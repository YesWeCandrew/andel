// src/routes/shopping_list.ts
import type { FastifyInstance } from 'fastify'
import { eq, inArray } from 'drizzle-orm'
import { db } from '../db.ts'
import { shopping_list } from '../schema.ts'
import { findOrCreateProduct, findOrCreateUnit } from '../lib/productUnit.ts'
import { addToShoppingList, allShoppingListItems, getShoppingListItem } from '../lib/shoppingListAdd.ts'
import { findOrNotFound } from '../lib/notFound.ts'
import { parseIdsQuery } from '../lib/parseIds.ts'
import type { AddShoppingListItemInput, UpdateShoppingListItemInput } from '../../../shared/shopping_list.ts'

export async function shoppingListRoutes(app: FastifyInstance) {

  // GET /shopping_list — list all items (active and completed), with product/unit names joined in.
  app.get('/shopping_list', async (request, reply) => {
    return allShoppingListItems()
  })

  // POST /shopping_list — add an item. Only `product` is required: quantity
  // defaults to 1, a blank unit means "piece". Products and units that don't
  // exist yet are created on the fly. If an active item already exists for
  // the same product + unit, its quantity is increased instead of adding a
  // second row. Every add is logged to product_unit_history so future adds
  // of this product can autocomplete the quantity/unit that's used most.
  app.post('/shopping_list', async (request, reply) => {
    const body = request.body as AddShoppingListItemInput
    const productName = body.product?.trim()

    if (!productName) {
      reply.code(400)
      return { error: 'product is required' }
    }

    const quantity = body.quantity ?? 1
    const productRow = await findOrCreateProduct(productName)
    const unitRow = await findOrCreateUnit(body.unit)
    const unitId = unitRow?.id ?? null

    const { item, created } = await addToShoppingList({ productId: productRow.id, unitId, quantity })
    if (created) reply.code(201)
    return item
  })

  // PATCH /shopping_list/:id — manually edit an item's product, quantity or unit.
  app.patch('/shopping_list/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const itemId = Number(id)
    const body = request.body as UpdateShoppingListItemInput

    const existing = await findOrNotFound(
      db.select().from(shopping_list).where(eq(shopping_list.id, itemId)),
      reply,
      'Shopping list item',
    )
    if (!existing) return

    const updates: Partial<typeof shopping_list.$inferInsert> = {}

    if (body.product !== undefined) {
      const trimmed = body.product.trim()
      if (!trimmed) {
        reply.code(400)
        return { error: 'product cannot be blank' }
      }
      updates.product_id = (await findOrCreateProduct(trimmed)).id
    }

    if (body.unit !== undefined) {
      const unitRow = await findOrCreateUnit(body.unit)
      updates.unit_id = unitRow?.id ?? null
    }

    if (body.quantity !== undefined) {
      updates.quantity = body.quantity
    }

    await db.update(shopping_list).set(updates).where(eq(shopping_list.id, itemId))

    return getShoppingListItem(itemId)
  })

  // POST /shopping_list/:id/complete — mark an item as bought.
  app.post('/shopping_list/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string }
    const itemId = Number(id)

    const existing = await findOrNotFound(
      db.select().from(shopping_list).where(eq(shopping_list.id, itemId)),
      reply,
      'Shopping list item',
    )
    if (!existing) return

    await db.update(shopping_list)
      .set({ active: false, completed_on: new Date() })
      .where(eq(shopping_list.id, itemId))

    return getShoppingListItem(itemId)
  })

  // DELETE /shopping_list?ids=1,2,3 — permanently remove a list of items.
  app.delete('/shopping_list', async (request, reply) => {
    const { ids } = request.query as { ids?: string }

    const itemIds = parseIdsQuery(ids, reply)
    if (!itemIds) return

    const deleted = await db.delete(shopping_list)
      .where(inArray(shopping_list.id, itemIds))
      .returning()

    return deleted
  })
}
