import { join } from 'node:path'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.ts'
import { DATA_DIR } from './lib/data_dir.ts'

const sqlite = new Database(process.env.DB_PATH ?? join(DATA_DIR, 'db.db'))

export const db = drizzle(sqlite, { schema })
