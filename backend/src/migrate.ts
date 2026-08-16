import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db.ts'
import { unit } from './schema.ts'

migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations applied')

// Seed the default units described in VISION.md. Idempotent: unit.unit is
// unique, so re-running on a database that already has them is a no-op.
const DEFAULT_UNITS = ['gram', 'ml', 'tsp', 'tbsp', 'cup']
await db.insert(unit).values(DEFAULT_UNITS.map((name) => ({ unit: name }))).onConflictDoNothing()
console.log('Default units seeded')
