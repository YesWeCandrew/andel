// src/routes/shopping_list.ts
import type { FastifyInstance } from 'fastify'
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../db.ts'
import { product, product_unit_history, shopping_list, unit } from '../schema.ts'
import type { AddShoppingListItemInput, UpdateShoppingListItemInput } from '../../../shared/shopping_list.ts'

// Case-insensitive find-or-create — this is what makes typing "Tomato" match
// an existing "tomato" row instead of spawning a near-duplicate product.
async function findOrCreateProduct(name: string): Promise<typeof product.$inferSelect> {
  const trimmed = name.trim()

  const [existing] = await db.select().from(product)
    .where(and(eq(product.active, true), sql`lower(${product.product}) = lower(${trimmed})`))
  if (existing) return existing

  // A successful insert always returns its one row.
  const [created] = await db.insert(product).values({ product: trimmed, active: true }).returning()
  return created!
}

// Returns null for a blank/omitted unit, which means "piece" (see VISION.md).
async function findOrCreateUnit(name: string | undefined): Promise<typeof unit.$inferSelect | null> {
  const trimmed = name?.trim()
  if (!trimmed) return null

  const [existing] = await db.select().from(unit)
    .where(and(eq(unit.active, true), sql`lower(${unit.unit}) = lower(${trimmed})`))
  if (existing) return existing

  // A successful insert always returns its one row.
  const [created] = await db.insert(unit).values({ unit: trimmed, active: true }).returning()
  return created!
}

function shoppingListQuery() {
  return db.select({
    id: shopping_list.id,
    active: shopping_list.active,
    completed_on: shopping_list.completed_on,
    created_on: shopping_list.created_on,
    quantity: shopping_list.quantity,
    unit_id: shopping_list.unit_id,
    unit: unit.unit,
    product_id: shopping_list.product_id,
    product: product.product,
  })
    .from(shopping_list)
    .leftJoin(unit, eq(shopping_list.unit_id, unit.id))
    .leftJoin(product, eq(shopping_list.product_id, product.id))
}

async function getShoppingListItem(id: number) {
  const [item] = await shoppingListQuery().where(eq(shopping_list.id, id))
  return item
}

export async function shoppingListRoutes(app: FastifyInstance) {

  // GET /shopping_list — list all items (active and completed), with product/unit names joined in.
  app.get('/shopping_list', async (request, reply) => {
    return shoppingListQuery().orderBy(asc(shopping_list.created_on))
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

    await db.insert(product_unit_history).values({
      product_id: productRow.id,
      unit_id: unitId,
      quantity,
    })

    const [existingItem] = await db.select().from(shopping_list)
      .where(and(
        eq(shopping_list.active, true),
        eq(shopping_list.product_id, productRow.id),
        unitId === null ? isNull(shopping_list.unit_id) : eq(shopping_list.unit_id, unitId),
      ))

    if (existingItem) {
      await db.update(shopping_list)
        .set({ quantity: (existingItem.quantity ?? 0) + quantity })
        .where(eq(shopping_list.id, existingItem.id))

      return getShoppingListItem(existingItem.id)
    }

    const [created] = await db.insert(shopping_list).values({
      active: true,
      created_on: new Date(),
      quantity,
      unit_id: unitId,
      product_id: productRow.id,
    }).returning()

    reply.code(201)
    return getShoppingListItem(created!.id)
  })

  // PATCH /shopping_list/:id — manually edit an item's product, quantity or unit.
  app.patch('/shopping_list/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const itemId = Number(id)
    const body = request.body as UpdateShoppingListItemInput

    const [existing] = await db.select().from(shopping_list).where(eq(shopping_list.id, itemId))
    if (!existing) {
      reply.code(404)
      return { error: 'Shopping list item not found' }
    }

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

    const [existing] = await db.select().from(shopping_list).where(eq(shopping_list.id, itemId))
    if (!existing) {
      reply.code(404)
      return { error: 'Shopping list item not found' }
    }

    await db.update(shopping_list)
      .set({ active: false, completed_on: new Date() })
      .where(eq(shopping_list.id, itemId))

    return getShoppingListItem(itemId)
  })

  // DELETE /shopping_list?ids=1,2,3 — permanently remove a list of items.
  app.delete('/shopping_list', async (request, reply) => {
    const { ids } = request.query as { ids?: string }

    if (!ids) {
      reply.code(400)
      return { error: 'ids query parameter is required' }
    }

    const itemIds = ids.split(',').map(Number)

    if (itemIds.some(Number.isNaN)) {
      reply.code(400)
      return { error: 'ids must be a comma-separated list of numbers' }
    }

    const deleted = await db.delete(shopping_list)
      .where(inArray(shopping_list.id, itemIds))
      .returning()

    return deleted
  })
}
