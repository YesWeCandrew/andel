import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',       // path to the file you just wrote
  out: './drizzle',               // folder where migration files will land
  dialect: 'sqlite',
  dbCredentials: {
    url: './db/db.db',              // path to your local SQLite file
  },
});