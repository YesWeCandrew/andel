import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, sqliteTableCreator} from 'drizzle-orm/sqlite-core'

export const todo = sqliteTable('todo',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        title: text('title').notNull(),
        active: integer('active', { mode: 'boolean' }).default(true).notNull(),
        emoji: text('emoji'),
        notes: text('notes'),
        frequency_days: integer('frequency_days'),
        next_completion_on: integer('next_completion_on', { mode: 'timestamp' }),
        created_on: integer('created_on', { mode: 'timestamp' }).notNull()
    }
)

export const todo_log = sqliteTable('todo_log',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        todo_id: integer('todo_id').references(() => todo.id),
        completed_on: integer('completed_on', { mode: 'timestamp' }).notNull()
    }
);

export const shopping_list = sqliteTable('shopping_list',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        active: integer('active', { mode: 'boolean' }).default(true).notNull(),
        completed_on: integer('completed_on', { mode: 'timestamp' }).notNull(),
        created_on: integer('created_on', { mode: 'timestamp' }).notNull(),
        quantity: real(),
        unit_id: integer('unit_id').references(() => unit.id),
        product: text('product')
    }
)

export const unit = sqliteTable('unit',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        unit: text('unit').unique(),
        active: integer('active', { mode: 'boolean' }).default(true).notNull()
    }
)

export const product = sqliteTable('product',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        product: text('product').unique(),
        active: integer('active', { mode: 'boolean' }).default(true).notNull()
    }
)

export const product_unit_history = sqliteTable('product_unit_history',
    {
        id: integer('id').primaryKey({ autoIncrement: true }),
        unit_id: integer('unit_id').references(() => unit.id),
        product_id: integer('product_id').references(() => product.id),
        quantity: real()
    }
)
