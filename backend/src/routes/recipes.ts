// src/routes/recipes.ts
import type { FastifyInstance } from 'fastify'
import { createWriteStream } from 'node:fs'
import { mkdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pipeline } from 'node:stream/promises'
import { asc, eq, inArray } from 'drizzle-orm'
import { db } from '../db.ts'
import { meal_plan_entry, product, recipe, recipe_ingredient, unit } from '../schema.ts'
import { findOrCreateProduct, findOrCreateUnit } from '../lib/productUnit.ts'
import { addToShoppingList } from '../lib/shoppingListAdd.ts'
import { MAX_PHOTO_BYTES, UPLOADS_DIR } from '../lib/uploads.ts'
import { findOrNotFound } from '../lib/notFound.ts'
import type {
  AddAllRecipeIngredientsToListInput,
  AddRecipeIngredientToListInput,
  CreateRecipeInput,
  RecipeIngredientInput,
  UpdateRecipeInput,
} from '../../../shared/recipe.ts'

const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const PHOTO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

function recipeIngredientQuery() {
  return db.select({
    id: recipe_ingredient.id,
    product_id: recipe_ingredient.product_id,
    product: product.product,
    unit_id: recipe_ingredient.unit_id,
    unit: unit.unit,
    quantity: recipe_ingredient.quantity,
    sort_order: recipe_ingredient.sort_order,
    note: recipe_ingredient.note,
  })
    .from(recipe_ingredient)
    .leftJoin(product, eq(recipe_ingredient.product_id, product.id))
    .leftJoin(unit, eq(recipe_ingredient.unit_id, unit.id))
}

async function getIngredients(recipeId: number) {
  const rows = await recipeIngredientQuery()
    .where(eq(recipe_ingredient.recipe_id, recipeId))
    .orderBy(asc(recipe_ingredient.sort_order))

  return rows.map((row) => ({ ...row, product: row.product ?? '' }))
}

async function getRecipe(id: number) {
  const [row] = await db.select().from(recipe).where(eq(recipe.id, id))
  if (!row) return null
  return { ...row, ingredients: await getIngredients(id) }
}

// Replaces a recipe's ingredient rows wholesale — simplest given how few
// ingredients a recipe has, and avoids a nested ingredient-CRUD API.
async function replaceIngredients(recipeId: number, ingredients: RecipeIngredientInput[]) {
  await db.delete(recipe_ingredient).where(eq(recipe_ingredient.recipe_id, recipeId))

  for (const [index, ingredient] of ingredients.entries()) {
    const productRow = await findOrCreateProduct(ingredient.product)
    const unitRow = await findOrCreateUnit(ingredient.unit)

    await db.insert(recipe_ingredient).values({
      recipe_id: recipeId,
      product_id: productRow.id,
      unit_id: unitRow?.id ?? null,
      quantity: ingredient.quantity,
      sort_order: index,
      note: ingredient.note ?? null
    })
  }
}

export async function recipeRoutes(app: FastifyInstance) {

  // GET /recipes — all recipes, summary shape, alphabetical. The dashboard
  // tile's "3 random" picks are a frontend concern over this list.
  // ingredientNames is included (product names only, no quantity/unit) so
  // the full-list search can match against ingredients without a per-recipe
  // detail fetch.
  app.get('/recipes', async () => {
    const recipes = await db.select({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      photo_path: recipe.photo_path,
    }).from(recipe).orderBy(asc(recipe.name))

    const ingredientRows = await db.select({
      recipe_id: recipe_ingredient.recipe_id,
      product: product.product,
    }).from(recipe_ingredient).leftJoin(product, eq(recipe_ingredient.product_id, product.id))

    const namesByRecipe = new Map<number, string[]>()
    for (const row of ingredientRows) {
      const names = namesByRecipe.get(row.recipe_id) ?? []
      names.push(row.product ?? '')
      namesByRecipe.set(row.recipe_id, names)
    }

    return recipes.map((r) => ({ ...r, ingredientNames: namesByRecipe.get(r.id) ?? [] }))
  })

  // GET /recipes/:id — one recipe with its ingredients joined in, ordered.
  app.get('/recipes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const found = await getRecipe(Number(id))
    if (!found) {
      reply.code(404)
      return { error: 'Recipe not found' }
    }
    return found
  })

  // POST /recipes — create a recipe. Only `name` is required; ingredients'
  // products/units are created on the fly if they don't already exist.
  app.post('/recipes', async (request, reply) => {
    const body = request.body as CreateRecipeInput
    const name = body.name?.trim()

    if (!name) {
      reply.code(400)
      return { error: 'name is required' }
    }

    const [created] = await db.insert(recipe).values({
      name,
      description: body.description?.trim() || null,
      steps: body.steps?.trim() || null,
      servings: body.servings ?? 1,
      created_on: new Date(),
    }).returning()

    await replaceIngredients(created!.id, body.ingredients ?? [])

    reply.code(201)
    return getRecipe(created!.id)
  })

  // PATCH /recipes/:id — update a recipe's fields and/or replace its ingredients.
  app.patch('/recipes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recipeId = Number(id)
    const body = request.body as UpdateRecipeInput

    const existing = await findOrNotFound(db.select().from(recipe).where(eq(recipe.id, recipeId)), reply, 'Recipe')
    if (!existing) return

    const updates: Partial<typeof recipe.$inferInsert> = {}

    if (body.name !== undefined) {
      const trimmed = body.name.trim()
      if (!trimmed) {
        reply.code(400)
        return { error: 'name cannot be blank' }
      }
      updates.name = trimmed
    }
    if (body.description !== undefined) updates.description = body.description.trim() || null
    if (body.steps !== undefined) updates.steps = body.steps.trim() || null
    if (body.servings !== undefined) updates.servings = body.servings

    if (Object.keys(updates).length > 0) {
      await db.update(recipe).set(updates).where(eq(recipe.id, recipeId))
    }

    if (body.ingredients !== undefined) {
      await replaceIngredients(recipeId, body.ingredients)
    }

    return getRecipe(recipeId)
  })

  // DELETE /recipes/:id — permanently remove a recipe and its ingredient rows.
  app.delete('/recipes/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recipeId = Number(id)

    const existing = await findOrNotFound(db.select().from(recipe).where(eq(recipe.id, recipeId)), reply, 'Recipe')
    if (!existing) return

    await db.delete(recipe_ingredient).where(eq(recipe_ingredient.recipe_id, recipeId))
    await db.delete(meal_plan_entry).where(eq(meal_plan_entry.recipe_id, recipeId))
    await db.delete(recipe).where(eq(recipe.id, recipeId))

    return existing
  })

  // POST /recipes/:id/photo — multipart upload (field name "photo"),
  // replaces any existing photo file.
  app.post('/recipes/:id/photo', async (request, reply) => {
    const { id } = request.params as { id: string }
    const recipeId = Number(id)

    const existing = await findOrNotFound(db.select().from(recipe).where(eq(recipe.id, recipeId)), reply, 'Recipe')
    if (!existing) return

    const file = await request.file()
    if (!file) {
      reply.code(400)
      return { error: 'photo file is required' }
    }

    if (!ALLOWED_PHOTO_TYPES.has(file.mimetype)) {
      reply.code(400)
      return { error: 'photo must be a jpeg, png or webp image' }
    }

    await mkdir(UPLOADS_DIR, { recursive: true })
    const filename = `${randomUUID()}${PHOTO_EXTENSION[file.mimetype]}`
    const filePath = join(UPLOADS_DIR, filename)
    await pipeline(file.file, createWriteStream(filePath))

    if (file.file.truncated) {
      await unlink(filePath).catch(() => {})
      reply.code(400)
      return { error: 'photo must be 5MB or smaller' }
    }

    const previousPhoto = existing.photo_path
    await db.update(recipe).set({ photo_path: `/uploads/${filename}` }).where(eq(recipe.id, recipeId))

    if (previousPhoto) {
      await unlink(join(UPLOADS_DIR, previousPhoto.replace('/uploads/', ''))).catch(() => {})
    }

    return getRecipe(recipeId)
  })

  // POST /recipes/:id/ingredients/:ingredientId/add-to-list — add one
  // ingredient's (already servings-scaled) quantity to the shopping list.
  app.post('/recipes/:id/ingredients/:ingredientId/add-to-list', async (request, reply) => {
    const { ingredientId } = request.params as { id: string; ingredientId: string }
    const body = request.body as AddRecipeIngredientToListInput

    const ingredient = await findOrNotFound(
      db.select().from(recipe_ingredient).where(eq(recipe_ingredient.id, Number(ingredientId))),
      reply,
      'Ingredient',
    )
    if (!ingredient) return

    const { item } = await addToShoppingList({
      productId: ingredient.product_id,
      unitId: ingredient.unit_id,
      quantity: body.quantity,
    })
    return item
  })

  // POST /recipes/:id/add-all-to-list — add every given ingredient's
  // (already servings-scaled) quantity to the shopping list in one request.
  app.post('/recipes/:id/add-all-to-list', async (request, reply) => {
    const body = request.body as AddAllRecipeIngredientsToListInput
    const ingredientIds = body.ingredients.map((i) => i.ingredientId)

    const rows = ingredientIds.length
      ? await db.select().from(recipe_ingredient).where(inArray(recipe_ingredient.id, ingredientIds))
      : []
    const rowsById = new Map(rows.map((row) => [row.id, row]))

    const results = []
    for (const { ingredientId, quantity } of body.ingredients) {
      const row = rowsById.get(ingredientId)
      if (!row) continue
      const { item } = await addToShoppingList({ productId: row.product_id, unitId: row.unit_id, quantity })
      results.push(item)
    }

    return results
  })
}
