import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { db } from './db.ts'

migrate(db, { migrationsFolder: './drizzle' })
console.log('Migrations applied')
