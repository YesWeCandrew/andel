// src/routes/meal_plan.ts
import type { FastifyInstance } from 'fastify'
import { and, asc, eq, gte, inArray, lte } from 'drizzle-orm'
import { db } from '../db.ts'
import { meal_plan_entry, recipe } from '../schema.ts'
import { findOrNotFound } from '../lib/notFound.ts'
import type { CreateMealPlanEntryInput, ReorderMealPlanInput } from '../../../shared/meal_plan.ts'

function mealPlanQuery() {
  return db.select({
    id: meal_plan_entry.id,
    date: meal_plan_entry.date,
    sort_order: meal_plan_entry.sort_order,
    recipe_id: meal_plan_entry.recipe_id,
    note: meal_plan_entry.note,
    created_on: meal_plan_entry.created_on,
    recipe_name: recipe.name,
    recipe_photo_path: recipe.photo_path,
  })
    .from(meal_plan_entry)
    .leftJoin(recipe, eq(meal_plan_entry.recipe_id, recipe.id))
}

function toEntry(row: Awaited<ReturnType<typeof mealPlanQuery>>[number]) {
  const { recipe_name, recipe_photo_path, ...entry } = row
  return {
    ...entry,
    recipe: entry.recipe_id !== null ? { id: entry.recipe_id, name: recipe_name!, photo_path: recipe_photo_path } : null,
  }
}

export async function mealPlanRoutes(app: FastifyInstance) {

  // GET /meal_plan?start=YYYY-MM-DD&end=YYYY-MM-DD — entries in the inclusive
  // range, ordered so each day's cards come back in the order they're shown.
  app.get('/meal_plan', async (request, reply) => {
    const { start, end } = request.query as { start?: string; end?: string }
    if (!start || !end) {
      reply.code(400)
      return { error: 'start and end query parameters are required' }
    }

    const rows = await mealPlanQuery()
      .where(and(gte(meal_plan_entry.date, start), lte(meal_plan_entry.date, end)))
      .orderBy(asc(meal_plan_entry.date), asc(meal_plan_entry.sort_order))

    return rows.map(toEntry)
  })

  // POST /meal_plan — add a recipe or a free-text note to a day. Exactly one
  // of recipe_id/note is expected; the new entry is appended to the end of
  // that day's list.
  app.post('/meal_plan', async (request, reply) => {
    const body = request.body as CreateMealPlanEntryInput
    const date = body.date?.trim()
    const note = body.note?.trim() || undefined

    if (!date) {
      reply.code(400)
      return { error: 'date is required' }
    }
    if (!body.recipe_id && !note) {
      reply.code(400)
      return { error: 'recipe_id or note is required' }
    }
    if (body.recipe_id && note) {
      reply.code(400)
      return { error: 'only one of recipe_id or note may be set' }
    }

    if (body.recipe_id) {
      const existingRecipe = await findOrNotFound(
        db.select().from(recipe).where(eq(recipe.id, body.recipe_id)),
        reply,
        'Recipe',
      )
      if (!existingRecipe) return
    }

    const existingForDay = await db.select().from(meal_plan_entry).where(eq(meal_plan_entry.date, date))

    const [created] = await db.insert(meal_plan_entry).values({
      date,
      recipe_id: body.recipe_id ?? null,
      note: note ?? null,
      sort_order: existingForDay.length,
      created_on: new Date(),
    }).returning()

    const [row] = await mealPlanQuery().where(eq(meal_plan_entry.id, created!.id))
    reply.code(201)
    return toEntry(row!)
  })

  // POST /meal_plan/reorder — sets `date` and `sort_order` (by array index)
  // for every id in entryIds. Covers both same-day reordering and moving a
  // card to a different day: the caller always sends the destination day's
  // full, final order. Mirrors the "replace wholesale" simplicity of
  // recipes.ts's replaceIngredients rather than computing partial shifts.
  app.post('/meal_plan/reorder', async (request, reply) => {
    const body = request.body as ReorderMealPlanInput
    const date = body.date?.trim()

    if (!date || !Array.isArray(body.entryIds)) {
      reply.code(400)
      return { error: 'date and entryIds are required' }
    }

    const rows = body.entryIds.length
      ? await db.select().from(meal_plan_entry).where(inArray(meal_plan_entry.id, body.entryIds))
      : []
    if (rows.length !== body.entryIds.length) {
      reply.code(404)
      return { error: 'One or more entries not found' }
    }

    for (const [index, id] of body.entryIds.entries()) {
      await db.update(meal_plan_entry).set({ date, sort_order: index }).where(eq(meal_plan_entry.id, id))
    }

    const updated = await mealPlanQuery().where(inArray(meal_plan_entry.id, body.entryIds))
    return updated.map(toEntry)
  })

  // DELETE /meal_plan/:id — remove one entry.
  app.delete('/meal_plan/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const entryId = Number(id)

    const existing = await findOrNotFound(
      db.select().from(meal_plan_entry).where(eq(meal_plan_entry.id, entryId)),
      reply,
      'Meal plan entry',
    )
    if (!existing) return

    await db.delete(meal_plan_entry).where(eq(meal_plan_entry.id, entryId))

    return existing
  })
}
