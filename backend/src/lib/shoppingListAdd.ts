// src/lib/shoppingListAdd.ts
import { and, asc, eq, isNull } from 'drizzle-orm'
import { db } from '../db.ts'
import { product, product_unit_history, shopping_list, unit } from '../schema.ts'

export function shoppingListQuery() {
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

export async function getShoppingListItem(id: number) {
  const [item] = await shoppingListQuery().where(eq(shopping_list.id, id))
  return item
}

export function allShoppingListItems() {
  return shoppingListQuery().orderBy(asc(shopping_list.created_on))
}

// Adds `quantity` of (productId, unitId) to the shopping list — merging into
// a matching active item for the same product + unit rather than adding a
// second row — and logs the add to product_unit_history so future adds of
// this product can autocomplete the quantity/unit that's used most. Shared
// by the shopping list's own POST and by "add to shopping list" from a
// recipe ingredient, since both boil down to the same operation once a
// product_id/unit_id are already resolved. `created` tells the caller
// whether a new row was inserted (so it can pick a 200 vs 201 status).
export async function addToShoppingList({
  productId,
  unitId,
  quantity,
}: {
  productId: number
  unitId: number | null
  quantity: number
}): Promise<{ item: Awaited<ReturnType<typeof getShoppingListItem>>; created: boolean }> {
  await db.insert(product_unit_history).values({
    product_id: productId,
    unit_id: unitId,
    quantity,
  })

  const [existingItem] = await db.select().from(shopping_list)
    .where(and(
      eq(shopping_list.active, true),
      eq(shopping_list.product_id, productId),
      unitId === null ? isNull(shopping_list.unit_id) : eq(shopping_list.unit_id, unitId),
    ))

  if (existingItem) {
    await db.update(shopping_list)
      .set({ quantity: (existingItem.quantity ?? 0) + quantity })
      .where(eq(shopping_list.id, existingItem.id))

    return { item: await getShoppingListItem(existingItem.id), created: false }
  }

  const [created] = await db.insert(shopping_list).values({
    active: true,
    created_on: new Date(),
    quantity,
    unit_id: unitId,
    product_id: productId,
  }).returning()

  return { item: await getShoppingListItem(created!.id), created: true }
}
