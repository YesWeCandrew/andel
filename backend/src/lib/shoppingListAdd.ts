// src/lib/shoppingListAdd.ts
import { and, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '../db.ts'
import { product, product_unit_history, shopping_list, shopping_list_source, unit } from '../schema.ts'

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

// Joins each item with the list of ways it was added (manual, or a recipe),
// used by the frontend to render source tags.
async function withSources<T extends { id: number }>(items: T[]): Promise<(T & { sources: { recipeId: number | null; recipeName: string | null }[] })[]> {
  if (items.length === 0) return []

  const sourceRows = await db.select({
    shopping_list_id: shopping_list_source.shopping_list_id,
    recipe_id: shopping_list_source.recipe_id,
    recipe_name: shopping_list_source.recipe_name,
  })
    .from(shopping_list_source)
    .where(inArray(shopping_list_source.shopping_list_id, items.map((item) => item.id)))

  const sourcesByItemId = new Map<number, { recipeId: number | null; recipeName: string | null }[]>()
  for (const row of sourceRows) {
    const sources = sourcesByItemId.get(row.shopping_list_id) ?? []
    sources.push({ recipeId: row.recipe_id, recipeName: row.recipe_name })
    sourcesByItemId.set(row.shopping_list_id, sources)
  }

  return items.map((item) => ({ ...item, sources: sourcesByItemId.get(item.id) ?? [] }))
}

export async function getShoppingListItem(id: number) {
  const [item] = await shoppingListQuery().where(eq(shopping_list.id, id))
  if (!item) return item
  const [withSource] = await withSources([item])
  return withSource
}

export async function allShoppingListItems() {
  const items = await shoppingListQuery().orderBy(asc(shopping_list.created_on))
  return withSources(items)
}

// Records a way an item was added (manual, or a specific recipe) as a tag,
// skipping it if that same way is already recorded for this item — so
// re-adding from the same recipe merges quantity without piling up
// duplicate tags.
async function addSourceIfMissing(
  shoppingListId: number,
  source: { recipeId: number; recipeName: string } | null,
) {
  const recipeId = source?.recipeId ?? null

  const [existingSource] = await db.select().from(shopping_list_source)
    .where(and(
      eq(shopping_list_source.shopping_list_id, shoppingListId),
      recipeId === null ? isNull(shopping_list_source.recipe_id) : eq(shopping_list_source.recipe_id, recipeId),
    ))

  if (existingSource) return

  await db.insert(shopping_list_source).values({
    shopping_list_id: shoppingListId,
    recipe_id: recipeId,
    recipe_name: source?.recipeName ?? null,
    created_on: new Date(),
  })
}

// Adds `quantity` of (productId, unitId) to the shopping list — merging into
// a matching active item for the same product + unit rather than adding a
// second row — and logs the add to product_unit_history so future adds of
// this product can autocomplete the quantity/unit that's used most. Shared
// by the shopping list's own POST and by "add to shopping list" from a
// recipe ingredient, since both boil down to the same operation once a
// product_id/unit_id are already resolved. `created` tells the caller
// whether a new row was inserted (so it can pick a 200 vs 201 status).
// `source` records how the add happened — null for a manual add, or the
// recipe it came from — as a tag on the item.
export async function addToShoppingList({
  productId,
  unitId,
  quantity,
  source,
}: {
  productId: number
  unitId: number | null
  quantity: number
  source: { recipeId: number; recipeName: string } | null
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

    await addSourceIfMissing(existingItem.id, source)
    return { item: await getShoppingListItem(existingItem.id), created: false }
  }

  const [created] = await db.insert(shopping_list).values({
    active: true,
    created_on: new Date(),
    quantity,
    unit_id: unitId,
    product_id: productId,
  }).returning()

  await addSourceIfMissing(created!.id, source)
  return { item: await getShoppingListItem(created!.id), created: true }
}
