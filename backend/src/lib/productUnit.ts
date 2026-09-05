// src/lib/productUnit.ts
import { and, eq, sql } from 'drizzle-orm'
import { db } from '../db.ts'
import { product, unit } from '../schema.ts'

// Case-insensitive find-or-create — this is what makes typing "Tomato" match
// an existing "tomato" row instead of spawning a near-duplicate product.
export async function findOrCreateProduct(name: string): Promise<typeof product.$inferSelect> {
  const trimmed = name.trim()

  const [existing] = await db.select().from(product)
    .where(and(eq(product.active, true), sql`lower(${product.product}) = lower(${trimmed})`))
  if (existing) return existing

  // A successful insert always returns its one row.
  const [created] = await db.insert(product).values({ product: trimmed, active: true }).returning()
  return created!
}

// Returns null for a blank/omitted unit, which means "piece" (see VISION.md).
export async function findOrCreateUnit(name: string | undefined): Promise<typeof unit.$inferSelect | null> {
  const trimmed = name?.trim()
  if (!trimmed) return null

  const [existing] = await db.select().from(unit)
    .where(and(eq(unit.active, true), sql`lower(${unit.unit}) = lower(${trimmed})`))
  if (existing) return existing

  // A successful insert always returns its one row.
  const [created] = await db.insert(unit).values({ unit: trimmed, active: true }).returning()
  return created!
}
