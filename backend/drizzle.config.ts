import { defineConfig } from 'drizzle-kit';
import { DATA_DIR } from './src/lib/data_dir.ts';

export default defineConfig({
  schema: './src/schema.ts',       // path to the file you just wrote
  out: './drizzle',               // folder where migration files will land
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH ?? `${DATA_DIR}/db.db`,
  },
});